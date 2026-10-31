'use strict';
// Risankasti slog iz 1930-ih: črnilne obrobe, ki "kipijo" (animacija na dvojke), oči v obliki pite,
// bele rokavice, gumijaste roke in noge. Vse je narisano v kodi.
const INK = '#1d1611';
const PAL = {
  cream: '#f4e7c5', paper: '#ecd9ab', white: '#fffaf0', skin: '#f6d2a2', cheek: '#e98a6e',
  grass: '#b5b86b', grass2: '#a3aa5c', grassDark: '#7e8945', leaf: '#6f9a47', leaf2: '#8fb456', pine: '#3f6e48', pine2: '#55875a',
  wood: '#8a5a33', woodDark: '#5e3b22', ballast: '#a89a84', sleeper: '#6b4a2f', rail: '#4a4038',
  water: '#7fb6ae', water2: '#a4d0c4', rock: '#a59a88', rock2: '#857a6a', snow: '#fbf6ea',
  red: '#cc4630', red2: '#9c3022', mustard: '#e7ac3c', teal: '#3f8079', teal2: '#2d5f5a', blue: '#4f73a8', navy: '#2e3f63',
  brass: '#d9a63e', coal: '#2a2420', roof: '#a8472f', yellow: '#f0c84a', cloud: '#fbf3e0',
};
const FONT_T = '"Rye", Georgia, serif';             // naslovi
const FONT = '"Fredoka", "Trebuchet MS", sans-serif'; // berljivo za otroke

let BOIL = 0;      // faza kipenja obrob (12 fps)
let BOILS = 0;     // počasna faza za vnaprej narisane sprajte (8 fps, 3 različice)
let BEAT = 0;      // utrip glasbe (v udarcih)

function hsh(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function jit(k, a) { return (hsh(k * 13.37 + BOIL * 71.3) - 0.5) * 2 * a; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// ---------- črnilni primitivi ----------
function stroke(g, lw, col = INK) { g.lineWidth = lw; g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
function inkPoly(g, pts, fill, lw = 3, amp = 0.7, seed = 0) {
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i] + jit(seed + i, amp), y = pts[i + 1] + jit(seed + i + 1, amp);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) stroke(g, lw);
}
function inkLine(g, pts, lw = 3, col = INK, amp = 0.6, seed = 0) {
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i] + jit(seed + i, amp), y = pts[i + 1] + jit(seed + i + 1, amp);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  stroke(g, lw, col);
}
function inkCurve(g, x0, y0, cx, cy, x1, y1, lw = 3, col = INK, seed = 0) {
  g.beginPath(); g.moveTo(x0 + jit(seed, 0.5), y0 + jit(seed + 1, 0.5));
  g.quadraticCurveTo(cx + jit(seed + 2, 1), cy + jit(seed + 3, 1), x1 + jit(seed + 4, 0.5), y1 + jit(seed + 5, 0.5));
  stroke(g, lw, col);
}
function inkEllipse(g, x, y, rx, ry, fill, lw = 3, seed = 0, rot = 0) {
  g.beginPath();
  g.ellipse(x + jit(seed, 0.5), y + jit(seed + 1, 0.5), Math.max(0.5, rx + jit(seed + 2, rx * 0.04 + 0.3)), Math.max(0.5, ry + jit(seed + 3, ry * 0.04 + 0.3)), rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) stroke(g, lw);
}
// skupina krogov z enotno zunanjo obrobo (krošnje, dim, oblaki)
function blobs(g, list, fill, lw = 3, seed = 0) {
  g.beginPath();
  list.forEach(([x, y, r], i) => {
    const rr = Math.max(0.5, r + jit(seed + i + 4, 0.5));   // negativen polmer bi sprožil napako v arc()
    const cx = x + jit(seed + i, 0.6), cy = y + jit(seed + i + 9, 0.6);
    g.moveTo(cx + rr, cy); g.arc(cx, cy, rr, 0, Math.PI * 2);
  });
  if (lw) stroke(g, lw * 2);
  g.fillStyle = fill; g.fill();
}
function shadow(g, x, y, rx, ry, a = 0.22) {
  g.fillStyle = `rgba(45,30,20,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
}
// napis z debelo obrobo
function toonText(g, txt, x, y, size, fill = PAL.cream, align = 'center', font = FONT, lw) {
  g.font = `bold ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = lw || Math.max(3, size * 0.2); g.strokeStyle = INK;
  g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
}
function plainText(g, txt, x, y, size, fill = INK, align = 'left', font = FONT, weight = 'bold') {
  g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = fill; g.fillText(txt, x, y);
}
// kartica s papirnato podlago in valovito obrobo
function card(g, x, y, w, h, fill = PAL.cream, seed = 0, r = 14) {
  g.beginPath();
  const n = 6;
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([x + r + (w - 2 * r) * i / n, y]);
  for (let i = 0; i <= n; i++) pts.push([x + w, y + r + (h - 2 * r) * i / n]);
  for (let i = 0; i <= n; i++) pts.push([x + w - r - (w - 2 * r) * i / n, y + h]);
  for (let i = 0; i <= n; i++) pts.push([x, y + h - r - (h - 2 * r) * i / n]);
  pts.forEach(([px, py], i) => { const jx = px + jit(seed + i, 0.9), jy = py + jit(seed + i + 50, 0.9); i ? g.lineTo(jx, jy) : g.moveTo(jx, jy); });
  g.closePath();
  g.fillStyle = 'rgba(29,22,17,0.35)'; g.save(); g.translate(5, 6); g.fill(); g.restore();
  g.fillStyle = fill; g.fill(); stroke(g, 4);
}

// ---------- ikone gumbov kontrolerja ----------
const BTN_COL = { A: '#5aa84a', B: '#d0473a', X: '#3f7fd0', Y: '#e3b23c' };
function btnGlyph(g, x, y, name, s = 11) {
  if (BTN_COL[name]) {
    inkEllipse(g, x, y, s, s, BTN_COL[name], 2.5, name.charCodeAt(0));
    toonText(g, name, x, y + 1, s * 1.15, PAL.white, 'center', FONT, 2.5);
    return s;
  }
  if (name.startsWith('L') && name.length === 2) {           // leva palica: L↕ ali L↔
    inkEllipse(g, x, y, s, s, '#4a4440', 2.5, 7);
    inkEllipse(g, x, y, s * 0.55, s * 0.55, '#6e6660', 1.5, 8);
    const v = name[1] === '↕';
    g.fillStyle = PAL.white;
    for (const d of [-1, 1]) {
      g.beginPath();
      if (v) { g.moveTo(x - 4, y + d * (s - 1)); g.lineTo(x + 4, y + d * (s - 1)); g.lineTo(x, y + d * (s + 5)); }
      else { g.moveTo(x + d * (s - 1), y - 4); g.lineTo(x + d * (s - 1), y + 4); g.lineTo(x + d * (s + 5), y); }
      g.closePath(); g.fill(); stroke(g, 1.2);
    }
    return s + 4;
  }
  const w = name.length * 9 + 10;                             // LT, RT, LB, RB, START
  inkPoly(g, [x - w / 2, y - s * 0.8, x + w / 2, y - s * 0.8, x + w / 2, y + s * 0.8, x - w / 2, y + s * 0.8], '#4a4440', 2.5, 0.4, 9);
  plainText(g, name, x, y + 1, s * 0.95, PAL.white, 'center');
  return w / 2;
}
// vrstica "ikona + opis", vrne x za naslednjo
function legend(g, x, y, names, label, size = 14, col = INK) {
  for (const n of names) { const r = btnGlyph(g, x + 12, y, n, 11); x += r * 2 + 6; }
  g.font = `bold ${size}px ${FONT}`;
  plainText(g, label, x + 4, y + 1, size, col, 'left');
  return x + 4 + g.measureText(label).width;
}

// ---------- oči v obliki pite ----------
function pieEye(g, x, y, s, look = 0, lookY = 0, blink = false, seed = 0) {
  if (blink) { inkLine(g, [x - s * 0.6, y, x + s * 0.6, y], Math.max(2, s * 0.3), INK, 0.3, seed); return; }
  inkEllipse(g, x, y, s * 0.6, s, PAL.white, Math.max(1.5, s * 0.22), seed);
  const px = x + look * s * 0.22, py = y + s * 0.15 + lookY * s * 0.2;
  g.fillStyle = INK; g.beginPath(); g.ellipse(px, py, s * 0.36, s * 0.66, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = PAL.white; g.beginPath(); g.moveTo(px + s * 0.05, py - s * 0.1); g.lineTo(px + s * 0.4, py - s * 0.62); g.lineTo(px + s * 0.42, py - s * 0.1); g.closePath(); g.fill();
}

// ---------- gumijasti liki ----------
// o: { shirt, pants, hat: 'cap'|'bandana'|'bowler'|'flower'|null, hatCol, phase, moving, carry, face, sc, blink, soot, mood, wave }
function drawToon(g, x, y, o) {
  const sc = o.sc || 1, f = o.face || 1, ph = o.phase || 0, mv = o.moving ? 1 : 0;
  const bob = mv ? -Math.abs(Math.sin(ph)) * 4 : Math.sin(BEAT * Math.PI) * 1.6;
  const sq = mv ? 1 + Math.sin(ph * 2) * 0.04 : 1 + Math.sin(BEAT * Math.PI * 2) * 0.03;
  g.save(); g.translate(x, y); g.scale(sc, sc);
  shadow(g, 0, 0, 16, 5);
  const seed = o.seed || 0;
  // noge
  const hipY = -24 + bob;
  for (const s of [-1, 1]) {
    const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 9 * mv;
    const lift = Math.max(0, Math.cos(ph + (s > 0 ? 0 : Math.PI))) * 4 * mv;
    const fx = s * 6 + sw * f, fy = -lift;
    inkCurve(g, s * 5, hipY, s * 7 + sw * 0.4, hipY + 12, fx, fy - 3, 4.5, INK, seed + s * 7);
    inkEllipse(g, fx + f * 4, fy - 2, 8, 4.5, '#3a2a22', 2.5, seed + s * 3);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(fx + f * 6, fy - 4, 2.5, 1.2, 0, 0, 7); g.fill();
  }
  g.save(); g.translate(0, hipY); g.scale(1 / sq, sq);
  // telo (fižol)
  inkEllipse(g, 0, -12, 13, 16, o.shirt || PAL.red, 3, seed + 20);
  g.save(); g.beginPath(); g.ellipse(0, -12, 13, 16, 0, 0, 7); g.clip();
  g.fillStyle = o.pants || PAL.navy; g.fillRect(-14, -6, 28, 20);
  g.fillStyle = PAL.brass; g.beginPath(); g.arc(-5, -4, 2, 0, 7); g.arc(5, -4, 2, 0, 7); g.fill();
  g.restore();
  inkEllipse(g, 0, -12, 13, 16, null, 3, seed + 20);
  // roke
  const shY = -22;
  for (const s of [-1, 1]) {
    let hx, hy, cx, cy;
    if (o.hand) { hx = o.hand[0] + s * 3; hy = o.hand[1] - hipY; cx = (s * 9 + hx) / 2 + s * 5; cy = (shY + hy) / 2 + 7; }
    else if (o.carry) { hx = s * 9; hy = -58; cx = s * 20; cy = -36; }
    else if (o.wave && s === f) { hx = s * 22; hy = -48 + Math.sin(BEAT * Math.PI * 4) * 5; cx = s * 24; cy = -28; }
    else {
      const sw = -Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 10 * mv + Math.sin(BEAT * Math.PI + s) * 2;
      hx = s * 18 + sw * f * 0.5; hy = 2 + Math.abs(sw) * 0.2; cx = s * 22; cy = -10;
    }
    inkCurve(g, s * 9, shY, cx, cy, hx, hy, 4.5, INK, seed + 30 + s);
    inkEllipse(g, hx, hy, 6, 5.5, PAL.white, 2.5, seed + 40 + s);
    inkLine(g, [hx - 2, hy - 2, hx - 2, hy + 1], 1.2, INK, 0.2);
  }
  g.restore();
  // glava
  const hy0 = hipY - 46 * 1;
  inkEllipse(g, 0, hy0, 15, 14, o.skin || PAL.skin, 3, seed + 50);
  if (o.soot) { g.fillStyle = 'rgba(40,30,25,0.35)'; g.beginPath(); g.ellipse(-6 * f, hy0 + 4, 6, 4, 0, 0, 7); g.ellipse(7 * f, hy0 - 3, 4, 3, 0, 0, 7); g.fill(); }
  g.fillStyle = PAL.cheek; g.globalAlpha = 0.6;
  g.beginPath(); g.arc(-9 + f * 3, hy0 + 5, 3, 0, 7); g.arc(9 + f * 3, hy0 + 5, 3, 0, 7); g.fill(); g.globalAlpha = 1;
  const bl = o.blink || (hsh(Math.floor(BEAT * 2) + seed) < 0.06);
  pieEye(g, -4 + f * 3, hy0 - 2, 5, f * 0.6, 0, bl, seed + 60);
  pieEye(g, 5 + f * 3, hy0 - 2, 5, f * 0.6, 0, bl, seed + 61);
  inkEllipse(g, f * 8, hy0 + 3, 3, 2.4, o.nose || '#c96a50', 2, seed + 62);
  const mood = o.mood || 'happy';
  if (mood === 'happy') { g.beginPath(); g.arc(f * 3, hy0 + 5, 5, 0.15 * Math.PI, 0.85 * Math.PI); stroke(g, 2.2); }
  else if (mood === 'oh') inkEllipse(g, f * 3, hy0 + 8, 2.5, 3, '#6a2a22', 2, seed + 63);
  else { g.beginPath(); g.arc(f * 3, hy0 + 11, 5, 1.15 * Math.PI, 1.85 * Math.PI); stroke(g, 2.2); }
  // pokrivalo
  const hc = o.hatCol || PAL.blue;
  if (o.hat === 'cap') {
    inkPoly(g, [-15, hy0 - 6, -13, hy0 - 17, 0, hy0 - 22, 13, hy0 - 17, 15, hy0 - 6], hc, 3, 0.5, seed + 70);
    for (let i = -8; i <= 8; i += 6) inkLine(g, [i, hy0 - 20, i + 1, hy0 - 7], 1.5, PAL.white, 0.3);
    inkPoly(g, [f * 4, hy0 - 7, f * 22, hy0 - 6, f * 20, hy0 - 2, f * 2, hy0 - 3], INK, 2, 0.4, seed + 71);
  } else if (o.hat === 'bandana') {
    inkPoly(g, [-15, hy0 - 4, -12, hy0 - 15, 0, hy0 - 18, 12, hy0 - 15, 15, hy0 - 4], hc, 3, 0.5, seed + 72);
    g.fillStyle = PAL.white; for (const [a, b] of [[-6, -12], [3, -14], [8, -8]]) { g.beginPath(); g.arc(a, hy0 + b, 1.6, 0, 7); g.fill(); }
    inkPoly(g, [-f * 14, hy0 - 8, -f * 24, hy0 - 12, -f * 22, hy0 - 2], hc, 2.5, 0.5, seed + 73);
  } else if (o.hat === 'bowler') {
    inkEllipse(g, 0, hy0 - 9, 17, 4, hc, 2.5, seed + 74);
    inkEllipse(g, 0, hy0 - 15, 10, 9, hc, 2.5, seed + 75);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-9, hy0 - 12, 18, 2.5);
  } else if (o.hat === 'helmet') {
    inkPoly(g, [-16, hy0 + 2, -16, hy0 - 12, -10, hy0 - 20, 10, hy0 - 20, 16, hy0 - 12, 16, hy0 + 2], '#b9c0c8', 3, 0.5, seed + 80);
    inkPoly(g, [-12 + f * 4, hy0 - 6, 12 + f * 4, hy0 - 6, 12 + f * 4, hy0 - 2, -12 + f * 4, hy0 - 2], INK, 0, 0.3, seed + 81);
    blobs(g, [[-f * 4, hy0 - 24, 5], [-f * 9, hy0 - 26, 5], [-f * 14, hy0 - 24, 4]], PAL.red, 2, seed + 82);
  } else if (o.hat === 'flower') {
    inkEllipse(g, 0, hy0 - 10, 18, 5, hc, 2.5, seed + 76);
    inkEllipse(g, 0, hy0 - 15, 9, 6, hc, 2.5, seed + 77);
    inkEllipse(g, 7, hy0 - 15, 4, 4, PAL.white, 2, seed + 78);
  }
  g.restore();
}

// ---------- vozila v psevdo-3D (kvader z vidnimi stranicami) ----------
// vrne oglišča in nariše vidne stranice + streho. o: {top, side, end, outline}
function box(g, cx, cy, ang, L, Wd, h, top, side, end, seed = 0, z0 = 0) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const fx = c * L / 2, fy = s * L / 2, nx = -s * Wd / 2, ny = c * Wd / 2;
  const base = [[cx + fx + nx, cy + fy + ny], [cx + fx - nx, cy + fy - ny], [cx - fx - nx, cy - fy - ny], [cx - fx + nx, cy - fy + ny]];
  const b = base.map(([x, y]) => [x, y - z0]);
  const t = base.map(([x, y]) => [x, y - z0 - h]);
  const faces = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const ex = b[j][0] - b[i][0], ey = b[j][1] - b[i][1];
    let nxv = ey, nyv = -ex;
    const mx = (b[i][0] + b[j][0]) / 2 - cx, my = (b[i][1] + b[j][1]) / 2 - (cy - z0);
    if (nxv * mx + nyv * my < 0) { nxv = -nxv; nyv = -nyv; }
    // stranica je vidna, če njena normala kaže proti gledalcu (navzdol po zaslonu)
    if (nyv > 0.01) faces.push({ i, j, long: i === 1 || i === 3 });
  }
  for (const f of faces) {
    const col = f.long ? side : end;
    inkPoly(g, [b[f.i][0], b[f.i][1], b[f.j][0], b[f.j][1], t[f.j][0], t[f.j][1], t[f.i][0], t[f.i][1]], col, 2.5, 0.5, seed + f.i * 5);
  }
  if (top) inkPoly(g, [t[0][0], t[0][1], t[1][0], t[1][1], t[2][0], t[2][1], t[3][0], t[3][1]], top, 2.5, 0.5, seed + 30);
  return { b, t, faces };
}
// točka na stranici (u vzdolž, v navzgor 0..1)
function facePt(bx, f, u, v, h) {
  const a = bx.b[f.i], c = bx.b[f.j];
  return [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u - h * v];
}
function cylinder(g, x, y, r, h, col, topCol = INK, seed = 0) {
  inkPoly(g, [x - r, y, x - r, y - h, x + r, y - h, x + r, y], col, 2.5, 0.4, seed);
  inkEllipse(g, x, y, r, r * 0.45, col, 2.5, seed + 3);
  g.fillStyle = col; g.fillRect(x - r + 1.5, y - h, r * 2 - 3, h);
  inkEllipse(g, x, y - h, r, r * 0.45, topCol, 2.5, seed + 5);
}
function wheel(g, x, y, r, rot, seed = 0) {
  inkEllipse(g, x, y, r, r, PAL.red2, 2.5, seed);
  g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath();
  for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 4; g.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); g.lineTo(x - Math.cos(a) * r * 0.8, y - Math.sin(a) * r * 0.8); }
  g.stroke();
  inkEllipse(g, x, y, r * 0.25, r * 0.25, PAL.brass, 1.5, seed + 2);
}

// Vagoni. car: {type:'loco'|'tender'|'P'|'F', ...}. sc = px/m. state: podatki za izris (vlak, razpoloženje ...)
const CAR_DIM = { loco: { L: 13, W: 3.4 }, tender: { L: 7, W: 3.2 }, P: { L: 12, W: 3.2 }, F: { L: 12, W: 3.2 } };
function drawCar(g, type, cx, cy, ang, sc, st) {
  const D = CAR_DIM[type], L = D.L * sc, Wd = D.W * sc, zk = sc * ZK;
  const c = Math.cos(ang), s = Math.sin(ang);
  const at = (u, n = 0) => [cx + c * u * sc - s * n * sc, cy + s * u * sc + c * n * sc];
  shadow(g, cx + 4, cy + 4, L * 0.55, Wd * 0.7 + Math.abs(s) * L * 0.25, 0.25);
  const wheels = (bx, n, r) => {
    const f = bx.faces.find(f => f.long);
    if (!f) return;
    for (let k = 0; k < n; k++) { const [x, y] = facePt(bx, f, (k + 0.5) / n, 0.0, 0); wheel(g, x, y - r * 0.4, r, (st.dist || 0) / 0.6, k); }
  };
  if (type === 'loco') {
    const fr = box(g, cx, cy, ang, L, Wd * 0.95, 1.1 * zk, PAL.coal, INK, INK, 1);
    wheels(fr, 3, 0.75 * sc);
    // odbijač spredaj
    const [px, py] = at(6.9);
    inkPoly(g, [px - s * 1.6 * sc, py + c * 1.6 * sc - zk * 0.4, px + c * 1.4 * sc, py + s * 1.4 * sc - zk * 0.4, px + s * 1.6 * sc, py - c * 1.6 * sc - zk * 0.4], PAL.red, 2.5, 0.5, 4);
    // kotel (spredaj) in kabina (zadaj)
    const [bx0, by0] = at(1.5);
    const boiler = box(g, bx0, by0, ang, 9.5 * sc, Wd * 0.72, 2.6 * zk, '#3c3a36', INK, '#2c2a26', 7, 1.1 * zk);
    for (const u of [0.25, 0.55]) {
      const f = boiler.faces.find(f => f.long);
      if (f) { const a = facePt(boiler, f, u, 0, 2.6 * zk), b = facePt(boiler, f, u, 1, 2.6 * zk); inkLine(g, [a[0], a[1], b[0], b[1]], 3, PAL.brass, 0.3); }
    }
    const zTop = (1.1 + 2.6) * zk;
    // dimnik, peščena kupola, parna kupola
    const [chx, chy] = at(5.0);
    cylinder(g, chx, chy - zTop + 2, 0.55 * sc, 1.9 * zk, INK, '#000', 11);
    inkEllipse(g, chx, chy - zTop + 2 - 1.9 * zk, 0.85 * sc, 0.4 * sc, '#151210', 2.5, 12);
    const [dx, dy] = at(2.0); cylinder(g, dx, dy - zTop + 2, 0.6 * sc, 0.8 * zk, PAL.brass, PAL.brass, 13);
    const [sx, sy] = at(-0.6); cylinder(g, sx, sy - zTop + 2, 0.55 * sc, 0.6 * zk, PAL.red, PAL.red, 14);
    if (st.sandLevel !== undefined) { g.fillStyle = PAL.mustard; g.beginPath(); g.ellipse(sx, sy - zTop + 2 - 0.6 * zk, 0.4 * sc * st.sandLevel, 0.18 * sc * st.sandLevel, 0, 0, 7); g.fill(); }
    // oči na dimnici
    const [ex, ey] = at(4.0);
    const eyeS = 0.7 * sc;
    const look = st.mood === 'dizzy' ? 0 : 1;
    for (const n of [-0.7, 0.7]) {
      const p = [ex - s * n * sc, ey + c * n * sc - zTop - 0.5];
      if (st.mood === 'dizzy') {
        inkEllipse(g, p[0], p[1], eyeS * 0.6, eyeS, PAL.white, 2, 20 + n);
        g.beginPath(); for (let a = 0; a < 12; a += 0.4) { const r = a * 0.05 * eyeS; g.lineTo(p[0] + Math.cos(a + BEAT * 4) * r, p[1] + Math.sin(a + BEAT * 4) * r * 1.4); } stroke(g, 1.5);
      } else pieEye(g, p[0], p[1], eyeS, c * look, s * look, st.blink, 20 + n);
      if (st.mood === 'angry' || st.mood === 'worried') {
        const k = st.mood === 'angry' ? 1 : -1;
        inkLine(g, [p[0] - eyeS * 0.7, p[1] - eyeS * (1.4 + 0.3 * k * Math.sign(n)), p[0] + eyeS * 0.7, p[1] - eyeS * (1.4 - 0.3 * k * Math.sign(n))], 2.5);
      }
    }
    if (st.mood === 'hot') for (let k = 0; k < 2; k++) { const t = (BEAT * 0.7 + k * 0.5) % 1; inkEllipse(g, ex + 1.5 * sc, ey - zTop - 4 + t * 10, 2, 3, PAL.water2, 1.5, 30 + k); }
    // kabina
    const [cbx, cby] = at(-4.6);
    const cab = box(g, cbx, cby, ang, 3.6 * sc, Wd, 3.0 * zk, null, PAL.red, PAL.red2, 15, 1.1 * zk);
    const f = cab.faces.find(f => f.long);
    if (f) {
      const q = [[0.2, 0.4], [0.8, 0.4], [0.8, 0.85], [0.2, 0.85]].map(([u, v]) => facePt(cab, f, u, v, 3 * zk)).flat();
      inkPoly(g, q, PAL.mustard, 2, 0.3, 16);
    }
    box(g, cbx, cby, ang, 4.1 * sc, Wd * 1.12, 0.35 * zk, '#2d2622', INK, INK, 17, 4.1 * zk);
  } else if (type === 'tender') {
    const bx = box(g, cx, cy, ang, L, Wd, 2.4 * zk, null, PAL.red, PAL.red2, 3, 0.4 * zk);
    wheels(bx, 2, 0.5 * sc);
    const f = bx.faces.find(f => f.long);
    if (f && st.showLevels) {
      const wl = clamp(st.water / TRAIN.waterCap, 0, 1);
      const a = facePt(bx, f, 0.12, 0.2, 2.4 * zk), b = facePt(bx, f, 0.88, 0.2, 2.4 * zk), a2 = facePt(bx, f, 0.12, 0.6, 2.4 * zk);
      const hh = a[1] - a2[1];
      inkPoly(g, [a[0], a[1], b[0], b[1], b[0], b[1] - hh, a[0], a[1] - hh], '#efe2c0', 2, 0.3, 5);
      g.fillStyle = PAL.water; g.fillRect(Math.min(a[0], b[0]) + 2, a[1] - 2 - (hh - 4) * 0, (Math.abs(b[0] - a[0]) - 4) * wl, -(hh - 4));
      for (let k = 1; k < 11; k++) { const x = lerp(a[0], b[0], k / 11); inkLine(g, [x, a[1], x, a[1] - hh * (k % 5 === 0 ? 0.6 : 0.3)], 1.2, INK, 0.2); }
    }
    // vrh: premog in pokrov za vodo
    const t = bx.t;
    inkPoly(g, [t[0][0], t[0][1], t[1][0], t[1][1], t[2][0], t[2][1], t[3][0], t[3][1]], '#3a302a', 2.5, 0.4, 7);
    const coal = clamp((st.coal || 0) / TRAIN.coalCap, 0, 1);
    if (coal > 0.01) {
      const mx = (t[0][0] + t[1][0] + t[2][0] + t[3][0]) / 4, my = (t[0][1] + t[1][1] + t[2][1] + t[3][1]) / 4;
      const r = (0.6 + coal * 1.6) * sc;
      const lumps = [];
      for (let k = 0; k < 7; k++) lumps.push([mx + c * (k - 3) * r * 0.45 + s * hsh(k) * 2, my + s * (k - 3) * r * 0.45 - coal * zk * 0.9 * (1 - Math.abs(k - 3) / 4), r * (0.45 + hsh(k + 3) * 0.2)]);
      blobs(g, lumps, PAL.coal, 2, 9);
      g.fillStyle = 'rgba(255,255,255,0.35)'; for (const [x, y, rr] of lumps) { g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.2, 0, 7); g.fill(); }
    }
    const [hx, hy] = at(-2.3); inkEllipse(g, hx, hy - 2.8 * zk, 0.7 * sc, 0.35 * sc, PAL.red2, 2, 8);
  } else if (type === 'P') {
    const bx = box(g, cx, cy, ang, L, Wd, 2.9 * zk, null, PAL.teal, PAL.teal2, 3, 0.5 * zk);
    wheels(bx, 2, 0.5 * sc);
    const f = bx.faces.find(f => f.long);
    if (f) {
      const H = 2.9 * zk;
      const slots = st.slots || [];
      const winU = [0.08, 0.2, 0.32, 0.6, 0.72, 0.84];
      winU.forEach((u, k) => {
        const a = facePt(bx, f, u, 0.45, H), b = facePt(bx, f, u + 0.09, 0.45, H), d = facePt(bx, f, u, 0.85, H), e = facePt(bx, f, u + 0.09, 0.85, H);
        inkPoly(g, [a[0], a[1], b[0], b[1], e[0], e[1], d[0], d[1]], '#f6e8bf', 2, 0.3, 40 + k);
        const it = slots[k];
        if (it) {
          const mx = (a[0] + b[0]) / 2, my = (a[1] + d[1]) / 2 + 2;
          const r = Math.abs(b[0] - a[0]) * 0.32 + 2;
          inkEllipse(g, mx, my + 1, r, r, PAL.skin, 1.5, 50 + k);
          inkEllipse(g, mx, my - r * 0.8, r * 1.1, r * 0.5, STATIONS[it.dest].color, 1.5, 60 + k);
        }
      });
      // vrata na sredini
      const a = facePt(bx, f, 0.44, 0.05, H), b = facePt(bx, f, 0.56, 0.05, H), d = facePt(bx, f, 0.44, 0.9, H), e = facePt(bx, f, 0.56, 0.9, H);
      inkPoly(g, [a[0], a[1], b[0], b[1], e[0], e[1], d[0], d[1]], PAL.mustard, 2, 0.3, 70);
      if (st.doorGlow) { g.strokeStyle = 'rgba(255,240,120,0.9)'; g.lineWidth = 4; g.stroke(); }
    }
    // streha
    box(g, cx, cy, ang, L * 1.02, Wd * 1.12, 0.45 * zk, PAL.cream, '#cdb98a', '#cdb98a', 80, 3.4 * zk);
    const r1 = at(-L / sc / 2 * 0.8), r2 = at(L / sc / 2 * 0.8);
    inkLine(g, [r1[0], r1[1] - 3.85 * zk, r2[0], r2[1] - 3.85 * zk], 2, PAL.red2, 0.4);
  } else if (type === 'F') {
    const H = 2.0 * zk;
    const bx = box(g, cx, cy, ang, L, Wd, H, null, '#9a6a3c', '#7a5230', 3, 0.5 * zk);
    wheels(bx, 2, 0.5 * sc);
    const t = bx.t;
    inkPoly(g, [t[0][0], t[0][1], t[1][0], t[1][1], t[2][0], t[2][1], t[3][0], t[3][1]], '#5e4128', 2.5, 0.4, 7);
    const slots = st.slots || [];
    for (let k = 0; k < SLOTS; k++) {
      const it = slots[k]; if (!it) continue;
      const u = ((k % 3) - 1) * 3.4, n = (Math.floor(k / 3) - 0.5) * 1.4;
      const [x, y] = at(u, n);
      crateIcon(g, x, y - H - 0.5 * zk - 3, 0.62 * sc, it.dest, 90 + k);
    }
    const f = bx.faces.find(f => f.long);
    if (f) {
      const a = facePt(bx, f, 0.38, 0.05, H), b = facePt(bx, f, 0.62, 0.05, H), d = facePt(bx, f, 0.38, 0.95, H), e = facePt(bx, f, 0.62, 0.95, H);
      inkPoly(g, [a[0], a[1], b[0], b[1], e[0], e[1], d[0], d[1]], '#b88a52', 2, 0.3, 70);
      inkLine(g, [a[0], a[1], e[0], e[1]], 1.5, INK, 0.3); inkLine(g, [b[0], b[1], d[0], d[1]], 1.5, INK, 0.3);
      if (st.doorGlow) { g.strokeStyle = 'rgba(255,240,120,0.9)'; g.lineWidth = 4; g.strokeRect(Math.min(a[0], b[0]) - 2, d[1] - 2, Math.abs(b[0] - a[0]) + 4, a[1] - d[1] + 4); }
    }
  }
}
function crateIcon(g, x, y, s, dest, seed = 0) {
  inkPoly(g, [x - s, y - s, x + s, y - s, x + s, y + s, x - s, y + s], '#c08a4c', 2, 0.4, seed);
  inkLine(g, [x - s, y - s, x + s, y + s], 1.5, INK, 0.3, seed + 1);
  inkLine(g, [x + s, y - s, x - s, y + s], 1.5, INK, 0.3, seed + 2);
  inkEllipse(g, x, y, s * 0.6, s * 0.6, STATIONS[dest].color, 1.8, seed + 3);
  if (s > 8) toonText(g, STATIONS[dest].code, x, y + 1, s * 0.7, PAL.white, 'center', FONT, 2.5);
}

// ---------- vnaprej narisani sprajti (3 različice za kipenje) ----------
const SPRITES = {};
function bake(name, w, h, fn) {
  SPRITES[name] = [0, 1, 2].map(v => { const [c, g] = mk(w, h); const sv = BOIL; BOIL = v * 17 + 3; fn(g, w, h, v); BOIL = sv; return c; });
}
function spr(name) { const a = SPRITES[name]; return a ? a[BOILS % a.length] : null; }

function bakeAll() {
  bake('tree', 84, 104, (g) => {
    shadow(g, 42, 96, 28, 8);
    inkPoly(g, [36, 97, 38, 62, 46, 62, 48, 97], PAL.wood, 3, 0.6, 1);
    blobs(g, [[42, 40, 26], [22, 52, 17], [62, 52, 17], [42, 62, 20], [30, 30, 15], [56, 30, 15]], PAL.leaf, 3, 2);
    blobs(g, [[36, 32, 10], [24, 46, 7], [52, 26, 7]], PAL.leaf2, 0, 3);
    g.fillStyle = INK; g.beginPath(); g.arc(34, 50, 2.2, 0, 7); g.arc(48, 50, 2.2, 0, 7); g.fill();
    g.beginPath(); g.arc(41, 54, 4, 0.2, Math.PI - 0.2); stroke(g, 2);
  });
  bake('tree2', 84, 104, (g) => {
    shadow(g, 42, 96, 28, 8);
    inkPoly(g, [37, 97, 39, 62, 45, 62, 47, 97], PAL.wood, 3, 0.6, 1);
    blobs(g, [[42, 44, 28], [24, 56, 16], [60, 56, 16], [42, 24, 18]], '#88a64a', 3, 4);
    blobs(g, [[34, 30, 9], [28, 48, 7]], '#a6c063', 0, 5);
    for (const [x, y] of [[30, 58], [54, 40], [46, 64], [58, 60]]) inkEllipse(g, x, y, 3.5, 3.5, PAL.red, 1.5, x);
  });
  bake('pine', 56, 104, (g) => {
    shadow(g, 28, 97, 20, 6);
    inkPoly(g, [24, 98, 25, 80, 31, 80, 32, 98], PAL.wood, 3, 0.5, 1);
    for (let i = 0; i < 4; i++) {
      const y0 = 10 + i * 18, w = 11 + i * 6;
      inkPoly(g, [28, y0, 28 + w, y0 + 30, 20 + w * 0.3, y0 + 26, 28 - w, y0 + 30], i % 2 ? PAL.pine : PAL.pine2, 3, 0.8, i * 9);
    }
  });
  bake('cypress', 30, 84, (g) => {
    shadow(g, 15, 78, 10, 4);
    inkEllipse(g, 15, 42, 10, 36, PAL.pine, 3, 2);
    inkCurve(g, 12, 20, 9, 40, 13, 66, 1.5, 'rgba(255,255,255,0.35)');
  });
  bake('bush', 46, 32, (g) => {
    shadow(g, 23, 27, 18, 4);
    blobs(g, [[14, 18, 9], [26, 14, 11], [35, 19, 8]], PAL.leaf, 2.5, 1);
    for (const [x, y] of [[15, 15], [29, 11], [34, 18]]) inkEllipse(g, x, y, 2.5, 2.5, '#f2b6c4', 1.2, x);
  });
  bake('flowers', 36, 20, (g) => {
    for (let k = 0; k < 6; k++) {
      const x = 5 + k * 5.2, y = 8 + (k % 2) * 6;
      inkLine(g, [x, y + 4, x, y + 9], 1.3, '#4c6a2c', 0.2);
      inkEllipse(g, x, y, 2.6, 2.6, ['#f7e27b', '#f2a0b5', '#ffffff'][k % 3], 1.2, k);
    }
  });
  bake('rock', 40, 28, (g) => {
    shadow(g, 20, 24, 17, 4);
    inkPoly(g, [4, 24, 8, 10, 20, 3, 33, 8, 37, 24], PAL.rock, 2.5, 0.6, 1);
    inkPoly(g, [8, 10, 20, 3, 21, 14], '#c0b6a4', 0, 0.4, 2);
  });
  for (const [i, wall] of ['#f2e6c8', '#efd38c', '#e8c0a0'].entries()) bake('house' + i, 116, 100, (g) => {
    shadow(g, 58, 94, 50, 8);
    inkPoly(g, [16, 94, 16, 54, 100, 54, 100, 94], wall, 3, 0.6, 1);
    inkPoly(g, [6, 58, 22, 16, 94, 16, 110, 58], PAL.roof, 3, 0.7, 2);
    inkLine(g, [22, 16, 94, 16], 2, INK, 0.4);
    for (let k = 1; k < 4; k++) inkLine(g, [10 + k * 4, 58 - k * 10, 106 - k * 4, 58 - k * 10], 1.2, 'rgba(29,22,17,0.5)', 0.5);
    inkPoly(g, [76, 18, 76, 4, 86, 4, 86, 18], '#c9b7a0', 2.5, 0.4, 3);
    inkPoly(g, [52, 94, 52, 70, 64, 70, 64, 94], PAL.woodDark, 2.5, 0.4, 4);
    for (const x of [26, 76]) { inkPoly(g, [x, 64, x + 14, 64, x + 14, 80, x, 80], '#9cc3d6', 2.5, 0.4, x); inkLine(g, [x + 7, 64, x + 7, 80], 1.5); }
    blobs(g, [[18, 92, 6], [98, 92, 6]], PAL.leaf, 2, 6);
  });
  bake('pole', 30, 76, (g) => {
    inkLine(g, [15, 74, 15, 6], 4, PAL.woodDark, 0.4);
    inkLine(g, [3, 12, 27, 12], 3.5, PAL.woodDark, 0.4);
    for (const x of [5, 13, 20, 26]) inkEllipse(g, x, 9, 1.8, 2.2, PAL.white, 1.2, x);
  });
  bake('fence', 56, 26, (g) => {
    for (const x of [6, 28, 50]) inkPoly(g, [x - 2.5, 24, x - 2.5, 6, x, 3, x + 2.5, 6, x + 2.5, 24], PAL.white, 2, 0.4, x);
    inkLine(g, [2, 11, 54, 11], 3, PAL.white, 0.5); inkLine(g, [2, 11, 54, 11], 0.8, INK, 0.3);
    inkLine(g, [2, 18, 54, 18], 3, PAL.white, 0.5);
  });
  bake('cow', 54, 38, (g) => {
    shadow(g, 27, 34, 22, 4);
    for (const x of [12, 18, 34, 40]) inkLine(g, [x, 24, x, 33], 3, INK, 0.3);
    inkEllipse(g, 26, 20, 17, 10, PAL.white, 2.5, 1);
    inkEllipse(g, 20, 17, 5, 4, INK, 0, 2); inkEllipse(g, 32, 23, 4, 3, INK, 0, 3);
    inkEllipse(g, 45, 13, 7, 7, PAL.white, 2.5, 4);
    inkEllipse(g, 49, 17, 4, 3, '#f2b6a6', 1.5, 5);
    pieEye(g, 44, 11, 2.2, 1, 0, false, 6);
    inkLine(g, [40, 6, 37, 2], 2, INK, 0.3); inkLine(g, [48, 6, 51, 2], 2, INK, 0.3);
  });
  bake('sheep', 40, 30, (g) => {
    shadow(g, 20, 27, 16, 3);
    for (const x of [11, 16, 25, 30]) inkLine(g, [x, 20, x, 27], 2.5, INK, 0.3);
    blobs(g, [[14, 15, 7], [21, 12, 8], [28, 15, 7], [20, 19, 7]], PAL.white, 2.5, 1);
    inkEllipse(g, 33, 12, 5, 5.5, INK, 1.5, 2);
    pieEye(g, 34, 11, 1.8, 1, 0, false, 3);
  });
  bake('vines', 64, 30, (g) => {
    inkLine(g, [2, 22, 62, 22], 1.5, PAL.woodDark, 0.3);
    for (let k = 0; k < 5; k++) {
      const x = 7 + k * 12.5;
      inkLine(g, [x, 26, x, 12], 2, PAL.woodDark, 0.3);
      blobs(g, [[x - 3, 13, 5], [x + 3, 12, 5], [x, 8, 5]], PAL.leaf, 2, k * 7);
      inkEllipse(g, x + 1, 17, 2.5, 3, '#7a3e6a', 1.2, k);
    }
  });
  bake('watertower', 70, 112, (g) => {
    shadow(g, 35, 106, 26, 6);
    for (const x of [16, 54]) inkLine(g, [x, 106, x + (35 - x) * 0.15, 52], 4, PAL.woodDark, 0.4);
    inkLine(g, [18, 80, 52, 80], 2.5, PAL.woodDark, 0.4);
    inkPoly(g, [10, 52, 10, 20, 60, 20, 60, 52], PAL.teal, 3, 0.5, 1);
    for (const y of [28, 44]) inkLine(g, [10, y, 60, y], 2, INK, 0.4);
    inkPoly(g, [6, 22, 35, 4, 64, 22], PAL.roof, 3, 0.5, 2);
    inkLine(g, [60, 40, 68, 46, 68, 60], 4, INK, 0.3);
  });
  bake('coalpile', 72, 40, (g) => {
    shadow(g, 36, 34, 32, 5);
    blobs(g, [[18, 26, 11], [32, 18, 14], [48, 22, 13], [60, 28, 9], [36, 30, 10]], PAL.coal, 2.5, 1);
    g.fillStyle = 'rgba(255,255,255,0.3)'; for (const [x, y] of [[28, 12], [46, 17], [16, 22]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
  });
  bake('stopboard', 26, 52, (g) => {
    inkLine(g, [13, 50, 13, 24], 3, '#555', 0.3);
    inkPoly(g, [2, 2, 24, 2, 24, 26, 2, 26], PAL.yellow, 2.5, 0.4, 1);
    toonText(g, 'H', 13, 15, 15, PAL.red, 'center', FONT, 3);
  });
  bake('church', 130, 118, (g) => {
    blobs(g, [[65, 92, 38], [36, 96, 22], [96, 96, 22]], PAL.leaf, 3, 1);
    inkPoly(g, [42, 96, 42, 66, 90, 66, 90, 96], PAL.white, 3, 0.5, 2);
    inkPoly(g, [36, 68, 52, 50, 82, 50, 96, 68], PAL.roof, 3, 0.5, 3);
    inkPoly(g, [56, 66, 56, 18, 72, 18, 72, 66], PAL.white, 3, 0.4, 4);
    inkPoly(g, [52, 20, 64, 0, 76, 20], PAL.roof, 3, 0.4, 5);
    inkEllipse(g, 64, 32, 4, 5, INK, 0, 6);
    blobs(g, [[50, 98, 7], [80, 98, 7]], PAL.pine2, 2, 7);
  });
  bake('raincloud', 150, 80, (g) => {
    blobs(g, [[40, 46, 26], [70, 34, 30], [104, 42, 26], [70, 54, 24], [124, 52, 16], [22, 56, 14]], '#9ea4ad', 3, 1);
    g.fillStyle = INK;
    g.beginPath(); g.ellipse(58, 44, 4, 6, 0, 0, 7); g.ellipse(84, 44, 4, 6, 0, 0, 7); g.fill();
    inkLine(g, [50, 34, 64, 38], 3); inkLine(g, [92, 34, 78, 38], 3);
    g.beginPath(); g.arc(71, 62, 7, 1.15 * Math.PI, 1.85 * Math.PI); stroke(g, 3);
  });
  bake('depot', 150, 116, (g) => {
    shadow(g, 75, 110, 66, 8);
    inkPoly(g, [12, 110, 12, 50, 138, 50, 138, 110], '#b08a5c', 3, 0.6, 1);
    for (let x = 24; x < 138; x += 14) inkLine(g, [x, 52, x, 108], 1.5, 'rgba(29,22,17,0.45)', 0.4, x);
    inkPoly(g, [4, 54, 24, 22, 126, 22, 146, 54], '#6d6a66', 3, 0.7, 2);
    inkPoly(g, [52, 110, 52, 70, 98, 70, 98, 110], '#2a2420', 2.5, 0.5, 3);
    blobs(g, [[64, 104, 10], [78, 100, 12], [90, 106, 9]], PAL.coal, 2, 4);
    card(g, 30, 30, 90, 20, PAL.cream, 5, 5);
    plainText(g, 'PREMOG', 75, 40, 13, INK, 'center');
  });
  STATIONS.forEach((st, i) => bake('station' + i, 210, 136, (g) => {
    shadow(g, 105, 128, 96, 10);
    inkPoly(g, [14, 128, 14, 60, 196, 60, 196, 128], PAL.yellow, 3, 0.6, 1);
    inkPoly(g, [2, 64, 26, 22, 184, 22, 208, 64], PAL.roof, 3, 0.7, 2);
    for (let k = 0; k < 5; k++) {
      const x = 28 + k * 34;
      if (k === 2) inkPoly(g, [x, 128, x, 86, x + 22, 86, x + 22, 128], PAL.woodDark, 2.5, 0.4, 3);
      else { inkPoly(g, [x, 112, x, 84, x + 22, 84, x + 22, 112], '#9cc3d6', 2.5, 0.4, 4 + k); inkLine(g, [x + 11, 84, x + 11, 112], 1.5); }
    }
    inkEllipse(g, 105, 40, 12, 12, PAL.white, 3, 9);
    inkLine(g, [105, 40, 105, 32, 105, 40, 111, 42], 2);
    card(g, 40, 64, 130, 18, PAL.cream, 10, 5);
    plainText(g, st.name.toUpperCase(), 105, 73, st.name.length > 14 ? 10 : 12, INK, 'center');
  }));
}
// prometni znak za omejitev (narisan ob prvi rabi)
function signSprite(v) {
  const key = 'sign' + v;
  if (!SPRITES[key]) bake(key, 34, 64, (g) => {
    inkLine(g, [17, 62, 17, 30], 3.5, '#666', 0.3);
    inkEllipse(g, 17, 17, 15, 15, PAL.white, 3, 1);
    g.beginPath(); g.arc(17, 17, 11.5, 0, 7); stroke(g, 4, PAL.red);
    plainText(g, String(v), 17, 18, 11, INK, 'center');
  });
  return spr(key);
}

// ---------- lokomotiva od strani (za slike ob koncu) ----------
function locoSide(g, x, y, s, rot, o = {}) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const soot = o.soot ? '#2a2420' : null;
  inkPoly(g, [-70, 10, 70, 10, 70, 22, -70, 22], INK, 3, 0.6, 1);                       // podvozje
  inkPoly(g, [-34, -26, 52, -26, 52, 10, -34, 10], soot || '#3c3a36', 3, 0.6, 2);         // kotel
  for (const bx of [-10, 20]) inkLine(g, [bx, -26, bx, 10], 3, PAL.brass, 0.4);
  inkPoly(g, [52, -28, 66, -28, 66, 10, 52, 10], soot || '#2c2a26', 3, 0.6, 3);           // dimnica
  inkPoly(g, [40, -26, 40, -50, 50, -50, 50, -26], INK, 3, 0.5, 4);                       // dimnik
  inkPoly(g, [34, -56, 56, -56, 50, -48, 40, -48], INK, 3, 0.5, 5);
  inkEllipse(g, 8, -28, 10, 7, PAL.brass, 3, 6);                                          // kupola
  inkPoly(g, [-72, -46, -34, -46, -34, 10, -72, 10], soot || PAL.red, 3, 0.6, 7);         // kabina
  inkPoly(g, [-66, -38, -42, -38, -42, -18, -66, -18], PAL.mustard, 2.5, 0.4, 8);
  inkPoly(g, [-78, -52, -28, -52, -28, -44, -78, -44], '#2d2622', 3, 0.5, 9);
  inkPoly(g, [66, 22, 66, 0, 84, 22], PAL.red, 3, 0.5, 10);                               // odbijač
  for (const wx of [-48, -8, 32]) wheel(g, wx, 20, 15, (o.spin || 0) + wx, wx);
  // obraz na dimnici
  if (o.dizzy) {
    inkEllipse(g, 58, -12, 6, 9, PAL.white, 2, 11);
    g.beginPath(); for (let a = 0; a < 12; a += 0.4) g.lineTo(58 + Math.cos(a + (o.spin || 0)) * a * 0.45, -12 + Math.sin(a + (o.spin || 0)) * a * 0.65); stroke(g, 1.6);
  } else pieEye(g, 58, -12, 7, 1, 0, false, 12);
  if (o.mouth) { g.beginPath(); g.arc(60, 2, 5, 1.15 * Math.PI, 1.85 * Math.PI); stroke(g, 2.5); }
  g.restore();
}
function stars(g, x, y, r, t, n = 4) {
  for (let k = 0; k < n; k++) {
    const a = t * 3 + k * Math.PI * 2 / n;
    const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.35;
    const p = []; for (let i = 0; i < 10; i++) { const aa = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 3 : 7; p.push(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); }
    inkPoly(g, p, PAL.yellow, 1.8, 0.3, k);
  }
}
// ilustracija ob koncu igre: kind = 'derail' | 'bridge' | 'boom'
function crashPicture(g, cx, cy, w, h, kind, t) {
  const x = cx - w / 2, y = cy - h / 2;
  inkPoly(g, [x - 10, y - 10, x + w + 10, y - 10, x + w + 10, y + h + 10, x - 10, y + h + 10], PAL.wood, 4, 0.8, 500);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (kind === 'bridge') {
    g.fillStyle = '#bcd6c8'; g.fillRect(x, y, w, h);
    g.fillStyle = PAL.grass; g.fillRect(x, y + h * 0.55, w * 0.22, h); g.fillRect(x + w * 0.78, y + h * 0.55, w, h);
    inkPoly(g, [x, y + h * 0.4, x + w * 0.24, y + h * 0.4, x + w * 0.28, y + h * 0.48, x + w * 0.2, y + h * 0.46, x, y + h * 0.46], PAL.wood, 3, 1, 501);
    inkPoly(g, [x + w, y + h * 0.4, x + w * 0.76, y + h * 0.4, x + w * 0.7, y + h * 0.5, x + w * 0.8, y + h * 0.46, x + w, y + h * 0.46], PAL.wood, 3, 1, 502);
    g.fillStyle = PAL.water; g.fillRect(x + w * 0.2, y + h * 0.62, w * 0.6, h);
    locoSide(g, cx + 10, cy + 30, 1.05, -0.95, { dizzy: true, spin: t * 4 });
    g.fillStyle = PAL.water; g.fillRect(x + w * 0.18, y + h * 0.72, w * 0.64, h);
    for (let k = 0; k < 6; k++) inkLine(g, [x + w * 0.22 + k * 40, y + h * 0.75 + Math.sin(t * 3 + k) * 3, x + w * 0.22 + k * 40 + 18, y + h * 0.72 + Math.sin(t * 3 + k) * 3, x + w * 0.22 + k * 40 + 36, y + h * 0.75], 2.5, PAL.water2, 0.4, k);
    for (const [px, c, ph] of [[cx - 110, PAL.red, 0], [cx + 120, PAL.teal, 1]]) {
      const py = y + h * 0.8 + Math.sin(t * 3 + ph) * 4;
      inkEllipse(g, px, py, 24, 9, PAL.white, 3, px); inkEllipse(g, px, py, 12, 4, PAL.water, 0, px + 1);
      inkEllipse(g, px, py - 14, 13, 12, PAL.skin, 3, px + 2);
      pieEye(g, px - 4, py - 16, 4, 0, 0, false, px + 3); pieEye(g, px + 4, py - 16, 4, 0, 0, false, px + 4);
      inkEllipse(g, px, py - 28, 13, 5, c, 2.5, px + 5);
    }
    const fy = y + h * 0.6 - Math.abs(Math.sin(t * 2)) * 50;
    inkPoly(g, [x + w * 0.62, fy, x + w * 0.62 + 22, fy - 8, x + w * 0.62 + 30, fy, x + w * 0.62 + 22, fy + 8], PAL.mustard, 2.5, 0.4, 510);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI; inkEllipse(g, cx - 10 + Math.cos(a) * 80, y + h * 0.66 - Math.sin(a) * (30 + (t * 40 + k * 9) % 30), 4, 6, PAL.water2, 1.5, k); }
  } else if (kind === 'boom') {
    g.fillStyle = '#e8c490'; g.fillRect(x, y, w, h);
    g.fillStyle = PAL.grass; g.fillRect(x, y + h * 0.7, w, h);
    blobs(g, [[cx - 40, cy - 40, 50], [cx + 30, cy - 50, 56], [cx + 90, cy - 20, 40], [cx - 100, cy - 10, 36], [cx, cy - 90, 40]], '#4a423c', 3, 520);
    locoSide(g, cx, cy + 50, 1.1, 0, { soot: true, mouth: true });
    for (const [px, f] of [[cx - 150, 1], [cx + 150, -1]]) {
      drawToon(g, px, y + h - 10, { shirt: f > 0 ? PAL.red : PAL.teal, pants: PAL.navy, hat: null, sc: 1.1, soot: true, skin: '#7a6a5c', face: f, mood: 'oh', seed: px });
      for (let k = -2; k <= 2; k++) inkLine(g, [px + k * 5, y + h - 72, px + k * 8, y + h - 90], 2.5, INK, 1, k);
    }
  } else {
    g.fillStyle = '#dbe6f0'; g.fillRect(x, y, w, h * 0.5);
    g.fillStyle = PAL.grass; g.fillRect(x, y + h * 0.5, w, h);
    inkLine(g, [x, y + h * 0.62, x + w * 0.35, y + h * 0.62, x + w * 0.45, y + h * 0.5, x + w * 0.5, y + h * 0.35], 5, PAL.rail, 0.8, 530);
    inkLine(g, [x, y + h * 0.7, x + w * 0.38, y + h * 0.7, x + w * 0.5, y + h * 0.58, x + w * 0.58, y + h * 0.42], 5, PAL.rail, 0.8, 531);
    locoSide(g, cx + 40, cy + 10, 1.05, Math.PI - 0.15, { dizzy: true, spin: t * 6 });
    stars(g, cx + 40, cy - 50, 50, t, 5);
    for (const [px, f, c, hat] of [[cx - 160, 1, PAL.red, 'cap'], [cx - 90, -1, PAL.teal, 'bandana']]) {
      drawToon(g, px, y + h - 14, { shirt: c, pants: f > 0 ? PAL.navy : '#6b4a2f', hat, hatCol: f > 0 ? PAL.blue : PAL.red, sc: 1.05, face: f, mood: 'oh', seed: px });
      stars(g, px, y + h - 100, 22, t + px, 3);
    }
    blobs(g, [[cx + 140, y + h - 20, 18], [cx + 165, y + h - 26, 14]], '#d8c69a', 2.5, 540);
  }
  g.restore();
}

// ---------- zanimivosti ob progi ----------
function drawDragon(g, x, y, t, f = 1) {
  const ph = t % 3, breath = ph > 1 && ph < 2, bob = Math.sin(t * 4) * 2;
  g.save(); g.translate(x, y); g.scale(f, 1);
  shadow(g, 0, 0, 48, 10);
  inkCurve(g, -30, -14, -62, -8, -70, -30, 9, INK, 1); inkCurve(g, -30, -14, -62, -8, -70, -30, 5, '#5f9a4a', 1);
  inkPoly(g, [-74, -28, -66, -40, -62, -26], PAL.red, 2.5, 0.4, 2);
  const wa = Math.sin(t * 6) * 0.4;
  for (const k of [0, 1]) { g.save(); g.translate(-6 + k * 10, -40 + bob); g.rotate(-0.6 - wa + k * 0.3); inkPoly(g, [0, 0, -30, -36, -8, -30, 6, -40, 10, -6], k ? '#7cb85f' : '#4f8a3e', 3, 0.6, 3 + k); g.restore(); }
  for (const lx of [-20, 18]) inkPoly(g, [lx - 6, -4, lx - 6, -16, lx + 6, -16, lx + 6, -4], '#4f8a3e', 2.5, 0.4, lx);
  inkEllipse(g, 0, -26 + bob, 32, 20, '#5f9a4a', 3, 5);
  inkEllipse(g, 6, -20 + bob, 18, 12, '#f2d27a', 2.5, 6);
  inkCurve(g, 22, -36 + bob, 32, -54, 40, -60 + bob, 10, INK, 7); inkCurve(g, 22, -36 + bob, 32, -54, 40, -60 + bob, 6, '#5f9a4a', 7);
  inkEllipse(g, 46, -64 + bob, 16, 12, '#5f9a4a', 3, 8);
  inkPoly(g, [56, -68 + bob, 72, -64 + bob, 72, -56 + bob, 56, -56 + bob], '#5f9a4a', 3, 0.4, 9);
  inkPoly(g, [38, -74 + bob, 34, -88 + bob, 44, -76 + bob], '#f2d27a', 2.5, 0.4, 10);
  pieEye(g, 48, -68 + bob, 5, 1, 0, false, 11);
  inkLine(g, [42, -76 + bob, 54, -72 + bob], 2.5);
  if (breath) {
    const k = (ph - 1);
    for (let i = 0; i < 6; i++) { const d = 20 + i * 14 * Math.min(1, k * 3); blobs(g, [[72 + d, -60 + bob + Math.sin(t * 20 + i) * 4, 6 + i * 1.6]], i % 2 ? PAL.yellow : '#f0902a', 2, 12 + i); }
  }
  g.restore();
}
function drawKnight(g, x, y, t, f = -1) {
  const ph = t % 3, attack = ph < 1, duck = ph > 1 && ph < 2;
  const lunge = attack ? Math.sin(ph * Math.PI) * 14 : 0;
  g.save(); g.translate(x + f * lunge, y);
  drawToon(g, 0, 0, { shirt: '#b9c0c8', pants: '#8a929a', hat: 'helmet', face: f, sc: 0.9, phase: t * 10, moving: attack, seed: 71, mood: duck ? 'oh' : 'happy' });
  const sw = attack ? -1.2 + Math.sin(ph * Math.PI) * 1.6 : -0.6;
  g.save(); g.translate(f * 16, -36); g.rotate(f * sw);
  inkLine(g, [0, 0, f * 34, -6], 5, INK, 0.3); inkLine(g, [0, 0, f * 34, -6], 2.5, '#e8eef2', 0.3);
  inkLine(g, [f * 2, -6, f * 2, 6], 4, PAL.brass, 0.3);
  g.restore();
  inkEllipse(g, -f * 10, duck ? -40 : -30, 12, 15, PAL.blue, 3, 72);
  inkLine(g, [-f * 10, (duck ? -40 : -30) - 10, -f * 10, (duck ? -40 : -30) + 10], 3, PAL.yellow, 0.3);
  if (attack && ph > 0.4 && ph < 0.7) stars(g, f * 50, -50, 10, t, 3);
  g.restore();
}
function drawUnicorn(g, x, y, t) {
  const walk = Math.sin(t * 0.5), f = Math.cos(t * 0.5) > 0 ? 1 : -1, ph = t * 7;
  const poop = (t % 5) / 5;
  g.save(); g.translate(x + walk * 40, y); g.scale(f, 1);
  shadow(g, 0, 0, 34, 7);
  // mavrica (kakec)
  if (poop > 0.35 && poop < 0.9) {
    const k = Math.min(1, (poop - 0.35) * 4);
    ['#e45b4a', '#f0a03a', '#f2d64a', '#6fb85a', '#4f8ad0', '#9a6ac8'].forEach((c, i) => {
      g.beginPath(); g.arc(-44, -26, 10 + i * 3.2, Math.PI * 0.5, Math.PI * (0.5 + 0.7 * k)); stroke(g, 4, c);
    });
  }
  const pile = Math.min(1, Math.max(0, (poop - 0.5) * 3));
  if (pile > 0) ['#9a6ac8', '#4f8ad0', '#6fb85a', '#f2d64a', '#e45b4a'].forEach((c, i) => inkEllipse(g, -60, -3 - i * 3.5 * pile, 9 - i * 1.5, 3.5, c, 1.5, i));
  for (const [lx, o] of [[-18, 0], [-10, Math.PI], [12, Math.PI], [20, 0]]) inkLine(g, [lx, -18, lx + Math.sin(ph + o) * 5, -1], 4, INK, 0.3);
  inkEllipse(g, 0, -26, 28, 13, PAL.white, 3, 1);
  inkCurve(g, -26, -30, -40, -38, -36, -16, 6, '#e48ab8', 2);
  inkCurve(g, -26, -30, -42, -34, -40, -14, 3, '#9ad0f0', 3);
  inkPoly(g, [14, -32, 22, -54, 34, -50, 26, -30], PAL.white, 3, 0.4, 4);
  inkEllipse(g, 34, -54, 12, 9, PAL.white, 3, 5);
  inkPoly(g, [32, -62, 38, -84, 42, -62], PAL.yellow, 2.5, 0.3, 6);
  for (let k = 0; k < 3; k++) inkLine(g, [33 + k * 2, -66 - k * 6, 41 - k * 1, -68 - k * 6], 1.2, PAL.brass, 0.2);
  blobs(g, [[24, -58, 5], [18, -50, 5], [16, -42, 4]], '#e48ab8', 2, 7);
  pieEye(g, 36, -56, 3.5, 1, 0, hsh(Math.floor(t * 2)) < 0.07, 8);
  inkEllipse(g, 44, -51, 2, 1.5, '#e48ab8', 0, 9);
  if (pile > 0.5) stars(g, -60, -30, 14, t, 3);
  g.restore();
}
function drawRoadCar(g, x, y, ang, col, seed) {
  const sc = PX, zk = PX * ZK;
  shadow(g, x + 3, y + 3, 2.6 * sc, 1.3 * sc, 0.25);
  box(g, x, y, ang, 4.2 * sc, 2 * sc, 0.8 * zk, col, col, col, seed, 0.3 * zk);
  const c = Math.cos(ang), s = Math.sin(ang);
  box(g, x - c * 0.3 * sc, y - s * 0.3 * sc, ang, 2.2 * sc, 1.8 * sc, 0.7 * zk, PAL.cream, '#9cc3d6', '#9cc3d6', seed + 9, 1.1 * zk);
  for (const n of [-0.45, 0.45]) pieEye(g, x + c * 2.1 * sc - s * n * sc, y + s * 2.1 * sc + c * n * sc - 1.1 * zk, 3, c, s, false, seed + n * 10);
}
// zapornica: a = 0 dvignjena, 1 spuščena
function drawBarrier(g, x, y, ux, uy, len, a) {
  inkLine(g, [x, y, x, y - 26], 4, INK, 0.3);
  inkEllipse(g, x, y - 26, 4, 4, PAL.red, 2, 1);
  const ex = x + ux * len * a, ey = y - 24 + uy * len * a - (1 - a) * len;
  g.beginPath(); g.moveTo(x, y - 24); g.lineTo(ex, ey); stroke(g, 6);
  g.save(); g.setLineDash([8, 8]); g.beginPath(); g.moveTo(x, y - 24); g.lineTo(ex, ey); stroke(g, 4, PAL.white); g.restore();
  g.save(); g.setLineDash([8, 8]); g.lineDashOffset = 8; g.beginPath(); g.moveTo(x, y - 24); g.lineTo(ex, ey); stroke(g, 4, PAL.red); g.restore();
  if (a > 0.5 && Math.floor(BEAT * 2) % 2) inkEllipse(g, x + 6, y - 32, 4, 4, '#ff5a3a', 1.5, 2);
}
