'use strict';
// Vmesne igre na progi (pogled od strani):
//  - odsek 0: hlod čez progo – oba igralca hkrati žagata levo, nato hkrati desno,
//  - odsek 1: skakalnica čez kanjon – vlak mora priti dovolj hitro, sicer 3 računi za ponovni skok,
//  - odsek 2: zmaj napade vlak – premog, katapult in balista iz laboratorija (3 računi za vsak načrt).
const P1_LOOK = { shirt: PAL.red, pants: PAL.navy, hat: 'cap', hatCol: PAL.blue, seed: 3 };
const P2_LOOK = { shirt: PAL.teal, pants: '#6b4a2f', hat: 'bandana', hatCol: PAL.red, seed: 9, soot: true };
const SIDE_U = 12.5;          // enot risbe na meter (locoSide je dolg ~13 m)
const SAW_TRAVEL = 22;        // skupna pot žage (2 = en poteg) do prereza
const JUMP_ANG = 0.28;        // naklon klančine (rad)
const CANYON_D = 26;          // m globine kanjona

// ---------- risbe od strani ----------
// (x, y) = sredina spodaj na tirnici, s = px na meter
function carSide(g, type, x, y, s, rot, o = {}) {
  g.save(); g.translate(x, y); g.rotate(rot || 0);
  const u = s / SIDE_U; g.scale(u, u);
  const spin = o.spin || 0;
  if (type === 'loco') locoSide(g, -3, -35, 1, 0, { spin, dizzy: o.dizzy, mouth: o.mouth });
  else if (type === 'tender') {
    inkPoly(g, [-44, -24, 44, -24, 44, -14, -44, -14], INK, 3, 0.5, 201);
    inkPoly(g, [-42, -66, 42, -66, 42, -22, -42, -22], PAL.red, 3, 0.6, 202);
    inkLine(g, [-42, -36, 42, -36], 2.5, PAL.red2, 0.4);
    blobs(g, [[-24, -68, 12], [-6, -72, 14], [14, -70, 12], [30, -67, 9]], PAL.coal, 2.5, 203);
    for (const wx of [-24, 24]) wheel(g, wx, -12, 12, spin + wx, wx);
  } else {
    const lab = o.lab;
    const body = type === 'P' ? PAL.teal : lab ? '#6c5a8a' : '#9a6a3c';
    inkPoly(g, [-76, -24, 76, -24, 76, -14, -76, -14], INK, 3, 0.5, 210);
    inkPoly(g, [-74, -88, 74, -88, 74, -22, -74, -22], body, 3, 0.6, 211);
    if (type === 'P') {
      for (let k = 0; k < 4; k++) {
        const wx = -62 + k * 32;
        inkPoly(g, [wx, -80, wx + 24, -80, wx + 24, -54, wx, -54], '#f6e8bf', 2.5, 0.4, 212 + k);
        if (o.heads && (k + (o.seed || 0)) % 3 !== 1) {
          inkEllipse(g, wx + 12, -62, 8, 8, PAL.skin, 2, 220 + k);
          pieEye(g, wx + 9, -64, 2.6, 0, -0.5, false, 224 + k); pieEye(g, wx + 15, -64, 2.6, 0, -0.5, false, 228 + k);
        }
      }
      inkLine(g, [-74, -46, 74, -46], 2.5, PAL.teal2, 0.4);
    } else if (lab) {
      for (const wx of [-48, 48]) {
        inkEllipse(g, wx, -62, 14, 14, '#c8f0a8', 3, 232 + wx);
        inkEllipse(g, wx - 3, -60, 4, 6, '#7ad0e0', 1.5, 234 + wx);
      }
      inkPoly(g, [-30, -50, 30, -50, 30, -30, -30, -30], PAL.cream, 2.5, 0.4, 236);
      plainText(g, 'LABORATORIJ', 0, -39, 9, '#6c5a8a', 'center');
      // dimnik z barvnimi mehurčki
      inkPoly(g, [30, -104, 40, -104, 40, -94, 30, -94], '#444', 2.5, 0.4, 237);
      for (let k = 0; k < 3; k++) { const t = (BEAT * 0.5 + k / 3) % 1; inkEllipse(g, 35 - t * 30, -110 - t * 40, 4 + t * 6, 4 + t * 6, ['#e48ab8', '#9ad0f0', '#c8f0a8'][k], 1.5, 238 + k); }
    } else {
      for (let k = -60; k <= 60; k += 20) inkLine(g, [k, -86, k, -24], 1.5, '#7a5230', 0.4, k);
      inkLine(g, [-70, -84, 70, -26], 2, '#7a5230', 0.4, 240); inkLine(g, [-70, -26, 70, -84], 2, '#7a5230', 0.4, 241);
    }
    inkPoly(g, [-80, -96, 80, -96, 76, -86, -76, -86], PAL.cream, 3, 0.5, 230);
    if (lab) inkPoly(g, [-16, -100, 16, -100, 14, -95, -14, -95], '#5e4128', 2.5, 0.4, 239);   // loputa
    for (const wx of [-50, 50]) wheel(g, wx, -12, 12, spin + wx, wx + 3);
  }
  g.restore();
}
// odmiki središč vozil od čela vlaka (m)
function trainCars(t) { return World.carList(t).map(c => ({ type: c.type, off: c.off, L: CAR_DIM[c.type].L })); }

// nebo, gore, hribi in smreke s paralakso; scroll v px
function backdrop(g, scroll, gy, o = {}) {
  const sky = g.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, o.top || '#b9d6d2'); sky.addColorStop(1, o.bottom || '#f4e7c5');
  g.fillStyle = sky; g.fillRect(0, 0, W, gy + 4);
  const layer = (f, sp, fn) => {
    const off = scroll * f, i0 = Math.floor(off / sp) - 1;
    for (let i = i0; i < i0 + W / sp + 3; i++) fn(i * sp - off, i);
  };
  layer(0.04, 340, (x, i) => { const y = 70 + hsh(i * 3.1) * 70; blobs(g, [[x, y, 24], [x + 30, y - 10, 30], [x + 60, y, 22]], PAL.cloud, 3, 600 + (i & 7)); });
  layer(0.12, 230, (x, i) => {
    const h = 150 + hsh(i * 7.7) * 120, b = gy - 40;
    inkPoly(g, [x - 160, b, x, b - h, x + 160, b], o.far || '#9fb0a0', 3, 0.8, 620 + (i & 15));
    inkPoly(g, [x - 45, b - h * 0.72, x, b - h, x + 45, b - h * 0.72, x + 12, b - h * 0.78, x - 14, b - h * 0.7], PAL.snow, 2, 0.4, 640 + (i & 15));
  });
  layer(0.35, 300, (x, i) => blobs(g, [[x, gy - 10, 110 + hsh(i) * 40], [x + 120, gy, 90]], o.hill || '#8fa060', 3, 660 + (i & 15)));
  if (o.trees !== false) layer(0.7, 120, (x, i) => {
    if (hsh(i * 1.7) < 0.35) return;
    const h = 60 + hsh(i * 2.3) * 50;
    inkLine(g, [x, gy, x, gy - 14], 5, PAL.woodDark, 0.3);
    inkPoly(g, [x - h * 0.35, gy - 10, x, gy - h, x + h * 0.35, gy - 10], PAL.pine, 3, 0.6, 680 + (i & 15));
  });
}
// tir od strani (ravna proga na višini gy)
function sideRails(g, scroll, gy, x0 = 0, x1 = W) {
  g.fillStyle = PAL.ballast; g.fillRect(x0, gy, x1 - x0, 16);
  inkLine(g, [x0, gy + 16, x1, gy + 16], 3, INK, 0.3);
  const sp = 26, o = ((scroll % sp) + sp) % sp;
  for (let x = x0 - o; x < x1; x += sp) inkPoly(g, [x, gy + 2, x + 14, gy + 2, x + 14, gy + 9, x, gy + 9], PAL.sleeper, 1.5, 0.3, Math.floor(x));
  inkLine(g, [x0, gy, x1, gy], 4, INK, 0.2); inkLine(g, [x0, gy - 1, x1, gy - 1], 1.5, '#d8d0c0', 0.2);
}
function burstText(g, x, y, text, sc = 1, col = PAL.yellow, seed = 77) {
  g.save(); g.translate(x, y); g.scale(sc, sc); g.rotate(-0.08);
  const p = []; for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2, r = k % 2 ? 44 : 70; p.push(Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.7); }
  inkPoly(g, p, col, 4, 2, seed);
  toonText(g, text, 0, 0, 30, PAL.red, 'center', FONT_T, 6);
  g.restore();
}
// leteči zmaj od strani: f = smer (1 desno), o: {breath, stun, net, angry}
function drawDragonFly(g, x, y, t, f, sc, o = {}) {
  g.save(); g.translate(x, y); g.scale(f * sc, sc);
  if (o.stun) g.rotate(Math.sin(t * 18) * 0.15);
  const wa = Math.sin(t * (o.net >= 3 ? 3 : 9));
  const body = '#5f9a4a', belly = '#f2d27a', dark = '#3f7a34';
  // rep
  inkCurve(g, -34, 4, -80, 30 + wa * 8, -110, 6, 11, INK, 1); inkCurve(g, -34, 4, -80, 30 + wa * 8, -110, 6, 7, body, 1);
  inkPoly(g, [-118, 2, -104, -12, -102, 14], PAL.red, 2.5, 0.4, 2);
  // zadnje krilo
  g.save(); g.translate(-6, -16); g.rotate(-0.4 - wa * 0.6);
  inkPoly(g, [0, 0, -40, -70, -10, -56, 8, -76, 22, -50, 30, -4], dark, 3, 0.6, 3); g.restore();
  // noge
  for (const lx of [-16, 14]) { inkLine(g, [lx, 14, lx - 4, 32], 6, INK, 0.3); inkLine(g, [lx, 14, lx - 4, 32], 3, body, 0.3); }
  inkEllipse(g, 0, 0, 42, 24, body, 3, 5);
  inkEllipse(g, 8, 8, 26, 13, belly, 2.5, 6);
  for (let k = -2; k <= 2; k++) inkLine(g, [8 + k * 8, -4 + Math.abs(k) * 2, 8 + k * 8, 18 - Math.abs(k)], 1.2, '#c9a85a', 0.2, k);
  // hrbtne bodice
  for (let k = 0; k < 4; k++) inkPoly(g, [-26 + k * 14, -20, -20 + k * 14, -34, -14 + k * 14, -20], PAL.red, 2, 0.3, 7 + k);
  // vrat in glava
  inkCurve(g, 30, -8, 46, -30, 60, -40, 15, INK, 8); inkCurve(g, 30, -8, 46, -30, 60, -40, 10, body, 8);
  inkEllipse(g, 68, -44, 20, 15, body, 3, 9);
  inkPoly(g, [78, -50, 102, -46, 102, -34, 80, -32], body, 3, 0.4, 10);
  inkEllipse(g, 98, -44, 2.5, 2, INK, 0, 11);
  inkPoly(g, [58, -56, 50, -76, 64, -58], belly, 2.5, 0.4, 12); inkPoly(g, [68, -58, 66, -78, 76, -58], belly, 2.5, 0.4, 13);
  if (o.stun) { inkLine(g, [64, -52, 74, -42], 2.5); inkLine(g, [74, -52, 64, -42], 2.5); stars(g, 68, -76, 22, t, 4); }
  else {
    pieEye(g, 70, -48, 6, 1, 0.3, false, 14);
    if (o.angry) inkLine(g, [60, -60, 78, -54], 3);
  }
  if (o.breath) { inkPoly(g, [88, -34, 102, -34, 100, -26, 90, -28], '#7a2a22', 2, 0.3, 15); }
  else { g.beginPath(); g.arc(88, -36, 7, 0.1 * Math.PI, 0.7 * Math.PI); stroke(g, 2.2); }
  // sprednje krilo
  g.save(); g.translate(4, -18); g.rotate(-0.2 - wa * 0.8);
  inkPoly(g, [0, 0, -30, -80, 0, -62, 20, -86, 36, -56, 40, -6], '#7cb85f', 3, 0.6, 16);
  inkLine(g, [0, 0, 20, -80], 2, dark, 0.3); g.restore();
  // mreža
  if (o.net) {
    g.save(); g.globalAlpha = 0.85; g.beginPath(); g.ellipse(10, -10, 60, 40, 0, 0, 7); g.clip();
    g.strokeStyle = '#e6d6a0'; g.lineWidth = 3;
    const n = 4 + o.net * 3;
    for (let k = -n; k <= n; k++) { g.beginPath(); g.moveTo(-60 + k * 14, -60); g.lineTo(-20 + k * 14, 40); g.moveTo(60 + k * 14, -60); g.lineTo(20 + k * 14, 40); g.stroke(); }
    g.restore();
  }
  g.restore();
}
function fireBlob(g, x, y, r, k) { blobs(g, [[x, y, r], [x - r * 0.5, y + r * 0.3, r * 0.6]], k % 2 ? PAL.yellow : '#f0902a', 2, k); }

// razbojnik s perjanico na klobuku jaha galopirajočega samoroga; (x, y) = kopita na tleh
function drawRider(g, x, y, t, f, sc, o = {}) {
  g.save(); g.translate(x, y); g.scale(f * sc, sc);
  const gal = o.won || o.idle ? 0 : t * 13, bob = Math.sin(gal) * 3;
  shadow(g, 0, 0, 40, 7);
  for (const [lx, ph] of [[-24, 0], [-15, 1.6], [16, 0.8], [25, 2.4]]) inkLine(g, [lx, -24 + bob, lx + Math.sin(gal + ph) * 11, -2 + Math.min(0, Math.cos(gal + ph)) * 6], 5, INK, 0.3);
  ['#e45b4a', '#f0a03a', '#f2d64a', '#6fb85a', '#4f8ad0'].forEach((c, i) => inkCurve(g, -30, -40 + bob, -50, -46 + i * 3, -60 + Math.sin(gal) * 5, -26 + i * 3, 3.5, c, i));
  inkEllipse(g, 0, -36 + bob, 33, 15, PAL.white, 3, 1);
  inkPoly(g, [16, -42 + bob, 28, -66 + bob, 42, -62 + bob, 32, -38 + bob], PAL.white, 3, 0.4, 4);
  inkEllipse(g, 44, -66 + bob, 14, 9, PAL.white, 3, 5);
  inkPoly(g, [40, -74 + bob, 48, -98 + bob, 50, -73 + bob], PAL.yellow, 2.5, 0.3, 6);
  blobs(g, [[26, -68 + bob, 6], [21, -59 + bob, 6], [18, -50 + bob, 5]], '#e48ab8', 2, 7);
  pieEye(g, 46, -68 + bob, 3.5, 1, 0, false, 8);
  inkEllipse(g, 55, -63 + bob, 2, 1.5, '#e48ab8', 0, 9);
  // jezdec
  const ry = -44 + bob;
  drawToon(g, -4, ry, { shirt: '#7a4a8a', pants: '#3a3a5a', sc: 0.82, face: 1, seed: 33, mood: o.stun ? 'oh' : o.won ? 'sad' : 'happy', wave: o.throwing });
  const hy = ry - 57;                     // višina glave
  // ruta čez nos in usta
  inkPoly(g, [-12, hy + 2, 12, hy + 2, 6, hy + 13, 0, hy + 17, -6, hy + 12], PAL.red2, 2, 0.4, 34);
  // širok klobuk z rdečo perjanico
  inkEllipse(g, -4, hy - 9, 22, 5, '#3a2a22', 2.5, 35);
  inkPoly(g, [-15, hy - 10, -13, hy - 24, 5, hy - 26, 7, hy - 10], '#3a2a22', 2.5, 0.4, 36);
  const w = Math.sin(t * 9) * 3;
  inkCurve(g, 2, hy - 22, -14, hy - 46 + w, -36, hy - 34 + w, 7, INK, 37); inkCurve(g, 2, hy - 22, -14, hy - 46 + w, -36, hy - 34 + w, 4.5, PAL.red, 37);
  inkCurve(g, 0, hy - 20, -18, hy - 38 + w, -32, hy - 26 + w, 3, PAL.yellow, 38);
  if (o.stun) stars(g, -4, hy - 40, 20, t, 3);
  if (o.net) {
    g.save(); g.globalAlpha = 0.85; g.beginPath(); g.ellipse(-2, hy + 10, 30, 44, 0, 0, 7); g.clip();
    g.strokeStyle = '#e6d6a0'; g.lineWidth = 3;
    for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(-40 + k * 12, hy - 40); g.lineTo(k * 12, hy + 60); g.moveTo(40 + k * 12, hy - 40); g.lineTo(k * 12, hy + 60); g.stroke(); }
    g.restore();
    if (o.net < 3) { inkEllipse(g, -2, hy + 10, 30, 44, null, 2, 39); }
  }
  g.restore();
}

const Events = (() => {
  const modes = ['saw', 'jump', 'chase', 'fire', 'blaze'];
  const dirOf = p => (p.lx < -0.5 || p.left) ? -1 : (p.lx > 0.5 || p.right) ? 1 : 0;

  function start(G, kind) {
    G.mini = null;
    Snd.setWhistle(false); Snd.setSqueal(0); Snd.setSlip(0); Snd.setHiss(0);
    G.mode = kind;
    if (kind === 'saw') G.ev = { kind, t: 0, sp: 0, need: -1, prog: 0, jam: 0, jamCd: 0, done: 0, dust: [], sawT: 0, strokes: 0 };
    else if (kind === 'jump') startJump(G);
    else if (kind === 'chase') startChase(G);
    else if (kind === 'blaze') startBlaze(G);
    else startFire(G);
  }

  // ---------- vožnja: sprožilci ----------
  function drive(G) {
    const t = G.train;
    if (G.log && G.log.state === 'idle') {
      const d = G.log.pos - t.pos;
      if (d < 10 && d > -20 && t.v > 0.05) {
        t.v = 0; t.pos = G.log.pos - 10; t.reg = 0;
        G.addPoints(-15); G.msg('BUM! Zaleteli ste se v hlod! −15', '#f3c2b2', 4);
        Snd.clank(); Ctl.rumble(0, 0.8, 0.8, 300); Ctl.rumble(1, 0.8, 0.8, 300);
        G.log.state = 'saw'; transition(() => start(G, 'saw')); return true;
      }
      if (Math.abs(t.v) < 0.05 && d >= 10 && d < 90) { G.log.state = 'saw'; transition(() => start(G, 'saw')); return true; }
    }
    if (G.jump && G.jump.state === 'idle' && t.pos >= G.jump.pos - JUMP_RAMP && t.pos < G.jump.pos && t.v > 0) {
      G.jump.state = 'fly'; G.jump.v = t.v; start(G, 'jump'); return true;
    }
    if (G.chase && G.chase.state === 'idle' && G.chase.pos && t.pos > G.chase.pos - 40 && t.pos < G.chase.pos + 300) {
      G.chase.state = 'fight'; Snd.whee();
      G.msg('Razbojnik na samorogu lovi vlak!', '#f3c2b2', 3);
      transition(() => start(G, 'chase')); return true;
    }
    if (G.dragon && G.dragon.state === 'idle' && G.dragon.pos && t.pos > G.dragon.pos - 20 && t.pos < G.dragon.tunnel) {
      G.dragon.state = 'fight'; Snd.roar();
      G.msg('Zmaj je ušel vitezu in napada vlak!', '#f3c2b2', 3);
      transition(() => start(G, 'fire')); return true;
    }
    if (G.blaze && G.blaze.state === 'idle' && G.blaze.pos) {
      const d = G.blaze.pos - t.pos;
      if (Math.abs(t.v) < 0.05 && Math.abs(d) < 70) {
        if (G.blaze.passed) { G.blaze.passed = false; G.addPoints(20); G.msg('Vrnila sta se – kazen preklicana! +20', '#d9ecc4', 3); }
        G.blaze.state = 'fight'; transition(() => start(G, 'blaze')); return true;
      }
      if (d < -90 && !G.blaze.passed) { G.blaze.passed = true; G.addPoints(-20); G.msg('Peljali ste mimo goreče hiše! −20 – vrnite se nazaj!', '#f3c2b2', 4); Snd.bad(); }
    }
    return false;
  }
  function alert(G) {
    const t = G.train;
    if (G.log && G.log.state === 'idle') {
      const d = G.log.pos - t.pos;
      if (d > 0 && d < 650) return { text: d < 90 ? 'Ustavi vlak pred hlodom!' : `Drevo na progi čez ${Math.round(d)} m – ustavi pred njim!`, col: '#f3c2b2' };
    }
    if (G.jump && G.jump.state === 'idle') {
      const d = G.jump.pos - JUMP_RAMP - t.pos, kmh = Math.abs(t.v) * 3.6;
      if (d > 0 && d < 700) return { text: `SKAKALNICA čez ${Math.round(d)} m – vsaj ${JUMP_KMH} km/h! (zdaj ${Math.round(kmh)})`, col: kmh >= JUMP_KMH ? '#d9ecc4' : '#fff0b8' };
    }
    if (G.blaze && G.blaze.state === 'idle' && G.blaze.pos) {
      const d = G.blaze.pos - t.pos;
      if (d <= -90 && G.blaze.passed && d > -2000) return { text: `Hiša gori ${Math.round(-d)} m za vami – vrnite se in pogasita!`, col: '#f3c2b2' };
      if (d > -90 && d < 700) return { text: Math.abs(d) < 70 ? 'USTAVI! Gostilna gori – pomagajta gasiti!' : `Ob progi gori hiša čez ${Math.round(d)} m – ustavi pri njej!`, col: '#f3c2b2' };
    }
    return null;
  }

  // ---------- 1) žaganje hloda ----------
  const SAW = { gy: 590, cx: 700, cy: 520, R: 70, kerf: 22 };
  function updateSaw(G, dt) {
    const e = G.ev;
    e.t += dt;
    e.jamCd = Math.max(0, e.jamCd - dt); e.jam = Math.max(0, e.jam - dt);
    for (const d of e.dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 500 * dt; d.life -= dt; }
    e.dust = e.dust.filter(d => d.life > 0);
    if (e.done) {
      e.done += dt;
      if (e.done > 3.2 && !G.trans) transition(() => {
        G.mode = 'drive'; G.ev = null; G.log.state = 'done'; World.snap();
        G.msg('Proga je prosta – naprej!', PAL.yellow, 3); whistleTimer = 0.8;
      });
      return;
    }
    if (e.t < 2) return;                 // odštevanje
    const d1 = dirOf(Ctl.p[0]), d2 = dirOf(Ctl.p[1]);
    e.in = [d1, d2];
    if (d1 && d2 && d1 !== d2) {
      e.jam = 0.3;
      if (!e.jamCd) { e.jamCd = 1.2; Snd.bad(); G.msg('Ne vlečeta skupaj!', '#f3c2b2', 1.2); }
    } else if (d1 === e.need && d2 === e.need) {
      const step = Math.min(dt * 2.4, Math.abs(e.need - e.sp));
      e.sp += e.need * step; e.prog = Math.min(1, e.prog + step / SAW_TRAVEL);
      e.sawT -= dt;
      if (e.sawT <= 0) { e.sawT = 0.16; Snd.saw(e.need); }
      const bx = SAW.cx + e.sp * 70, by = SAW.cy - SAW.kerf - SAW.R + e.prog * 2 * SAW.R;
      for (let k = 0; k < 2; k++) e.dust.push({ x: bx + (Math.random() - 0.5) * 160, y: by, vx: (Math.random() - 0.5) * 160 + e.need * 60, vy: -120 - Math.random() * 120, life: 0.7 });
      if (Math.abs(e.sp - e.need) < 1e-3) {
        e.need = -e.need; e.strokes++;
        Ctl.rumble(0, 0.2, 0.3, 60); Ctl.rumble(1, 0.2, 0.3, 60);
      }
      if (e.prog >= 1) {
        e.done = 0.01; e.time = e.t - 2;
        const p = e.time < 18 ? 40 : e.time < 30 ? 25 : 10;
        G.addPoints(p); G.score.saw = e.time;
        G.msg(`Prežagano v ${e.time.toFixed(1)} s! +${p}`, '#d9ecc4', 4);
        Snd.good(); Snd.clank();
      }
    }
  }
  function drawSaw(g, G) {
    const e = G.ev, { gy, cx, cy, R, kerf } = SAW;
    backdrop(g, 0, gy, {});
    g.fillStyle = PAL.grass; g.fillRect(0, gy, W, H - gy);
    sideRails(g, 0, gy);
    // vlak stoji levo
    const cars = trainCars(G.train), M = 16;
    for (const c of cars) carSide(g, c.type, 300 - c.off * M, gy, M, 0, { heads: true, seed: c.off | 0 });
    puff(g, 300 - 1.5 * M, gy - 200, G.time);
    if (e.done) {
      // odrezan kos se odkotali, drevo leži ob progi
      const k = Math.min(1, e.done / 2.2);
      const rx = cx + k * k * 700, rot = k * 9;
      drawLog(g, cx - 40 * k, cy + 6, R, kerf, 0, true);
      g.save(); g.translate(rx, cy); g.rotate(rot);
      inkEllipse(g, 0, 0, R, R, '#e8c890', 3.5, 701);
      for (let r = 20; r < R; r += 18) inkEllipse(g, 0, 0, r, r, null, 1.5, 702 + r);
      inkLine(g, [-R * 0.6, 0, R * 0.6, 0], 2, '#a07a4a', 0.4);
      g.restore();
      const hop = Math.abs(Math.sin(e.done * 9)) * 26;
      drawToon(g, cx - 250, gy + 20 - hop, { ...P1_LOOK, sc: 2, wave: true, mood: 'happy', face: 1 });
      drawToon(g, cx + 250, gy + 20 - hop, { ...P2_LOOK, sc: 2, wave: true, mood: 'happy', face: -1 });
      if (e.done < 2.5) burstText(g, cx, 180, 'ŠVRK!', 1.3);
    } else {
      drawLog(g, cx, cy, R, kerf, e.prog, false);
      // žaga (za čelom hloda – spodnji del skrije prvi kolobar)
      const bx = cx + e.sp * 70 + (e.jam ? Math.sin(G.time * 80) * 4 : 0), by = cy - kerf - R + e.prog * 2 * R - 4;
      const bend = e.jam ? 14 : 0;
      g.beginPath(); g.moveTo(bx - 170, by); g.quadraticCurveTo(bx, by + 6 + bend, bx + 170, by);
      g.lineTo(bx + 170, by + 20); g.quadraticCurveTo(bx, by + 30 + bend, bx - 170, by + 20); g.closePath();
      g.fillStyle = '#c8ccd0'; g.fill(); stroke(g, 3);
      g.beginPath(); for (let k = 0; k <= 34; k++) { const x = bx - 170 + k * 10, y = by + 20 + (k % 2 ? 8 : 0) + Math.sin(k / 34 * Math.PI) * (10 + bend); k ? g.lineTo(x, y) : g.moveTo(x, y); } stroke(g, 2);
      for (const sd of [-1, 1]) inkPoly(g, [bx + sd * 170 - 7, by - 10, bx + sd * 170 + 7, by - 10, bx + sd * 170 + 7, by + 52, bx + sd * 170 - 7, by + 52], PAL.wood, 3, 0.4, 710 + sd);
      // sprednji kolobar prekrije list
      inkEllipse(g, cx, cy, R, R, '#e8c890', 3.5, 701);
      for (let r = 20; r < R; r += 18) inkEllipse(g, cx, cy, r, r, null, 1.5, 702 + r);
      inkEllipse(g, cx + 6, cy - 4, 6, 5, '#a07a4a', 0, 709);
      // igralca vlečeta za ročaja
      for (const [i, look, hx, f] of [[0, P1_LOOK, bx - 170, 1], [1, P2_LOOK, bx + 170, -1]]) {
        const tx = hx - f * 62, sc = 1.9;
        const mood = e.jam ? 'oh' : 'happy';
        drawToon(g, tx, gy + 20, { ...look, sc, face: f, mood, hand: [(hx - tx) / sc, (by + 40 - gy - 20) / sc] });
        // smer, ki jo igralec drži
        const d = e.in ? e.in[i] : 0, ax = cx + (i ? 300 : -300), ay = gy - 250;
        if (e.t >= 2) {
          inkEllipse(g, ax, ay, 30, 30, d === e.need ? '#9cc58a' : d ? '#e58a74' : PAL.cream, 3, 720 + i);
          if (d) inkPoly(g, [ax + d * 20, ay, ax - d * 10, ay - 14, ax - d * 10, ay + 14], INK, 0, 0.3, 722 + i);
          else plainText(g, '?', ax, ay + 2, 26, INK, 'center');
          plainText(g, i ? 'KURJAČ' : 'STROJEVODJA', ax, ay - 44, 14, i ? PAL.teal2 : PAL.red2, 'center');
        }
      }
      for (const d of e.dust) inkEllipse(g, d.x, d.y, 4, 3, '#e8c890', 1.5, Math.floor(d.x));
    }
    // zgoraj: naslov, ukaz, napredek, čas
    card(g, W / 2 - 330, 16, 660, 120, PAL.cream, 730, 16);
    toonText(g, 'DREVO NA PROGI!', W / 2, 46, 30, PAL.red, 'center', FONT_T, 6);
    if (!e.done && e.t < 2) {
      plainText(g, 'Žagajta skupaj: oba LEVO, nato oba DESNO', W / 2, 84, 18, INK, 'center');
      toonText(g, String(Math.ceil(2 - e.t)), W / 2, 116, 30, PAL.mustard, 'center', FONT_T, 5);
    } else if (!e.done) {
      const L = e.need < 0;
      const lx = legend(g, W / 2 - 230, 84, ['L↔'], L ? 'Oba LEVO!' : 'Oba DESNO!', 22, L ? PAL.red2 : PAL.teal2);
      const ax = lx + 26, d = L ? -1 : 1;
      inkPoly(g, [ax + d * 16, 84, ax - d * 10, 72, ax - d * 10, 96], L ? PAL.red : PAL.teal, 2.5, 0.3, 732);
      plainText(g, `${(e.t - 2).toFixed(1)} s`, W / 2 + 280, 84, 18, INK, 'right');
      inkPoly(g, [W / 2 - 280, 106, W / 2 + 280, 106, W / 2 + 280, 124, W / 2 - 280, 124], PAL.white, 2.5, 0.3, 731);
      g.fillStyle = PAL.mustard; g.fillRect(W / 2 - 278, 108, 556 * e.prog, 14);
    } else plainText(g, `Prežagano v ${e.time.toFixed(1)} s!`, W / 2, 96, 22, '#2d6a2d', 'center');
  }
  function drawLog(g, cx, cy, R, kerf, prog, aside) {
    // telo hloda gre od nas proti obzorju, krošnja zadaj
    const fx = cx + 40, fy = cy - 120, fr = R * 0.8;
    blobs(g, [[fx - 90, fy - 70, 60], [fx, fy - 110, 74], [fx + 90, fy - 70, 58], [fx + 40, fy - 30, 50], [fx - 50, fy - 20, 46]], PAL.leaf, 3.5, 740);
    blobs(g, [[fx - 40, fy - 90, 30], [fx + 50, fy - 96, 26]], PAL.leaf2, 0, 741);
    inkLine(g, [fx - 20, fy - 10, fx - 70, fy - 90], 7, PAL.woodDark, 0.5); inkLine(g, [fx + 20, fy - 10, fx + 80, fy - 80], 7, PAL.woodDark, 0.5);
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(fx - fr, fy); g.lineTo(fx + fr, fy); g.lineTo(cx + R, cy); g.closePath();
    g.fillStyle = PAL.wood; g.fill(); stroke(g, 3.5);
    inkEllipse(g, fx, fy, fr, fr, PAL.wood, 3.5, 742);
    for (let k = 0; k < 5; k++) inkLine(g, [cx - R * 0.7 + k * R * 0.35, cy - R * 0.9 + Math.abs(k - 2) * 8, fx - fr * 0.7 + k * fr * 0.35, fy - fr * 0.6], 1.5, PAL.woodDark, 0.5, 743 + k);
    if (!aside) {
      // zarez na vrhu hloda
      inkLine(g, [cx - R * 0.9 + 8, cy - kerf - R * 0.42, cx + 8, cy - kerf - R - 2, cx + R * 0.9 + 8, cy - kerf - R * 0.42], 3 + prog * 4, '#3a2a1a', 0.3);
    }
  }
  function puff(g, x, y, t) {
    for (let k = 0; k < 3; k++) { const q = (t * 0.4 + k / 3) % 1; blobs(g, [[x - q * 30, y - q * 120, 12 + q * 24]], PAL.cloud, 2.5, 750 + k); }
  }

  // ---------- 2) skakalnica ----------
  function startJump(G) {
    const v = G.jump.v, cars = trainCars(G.train);
    const gEff = (JUMP_KMH / 3.6) ** 2 * Math.sin(2 * JUMP_ANG) / JUMP_GAP;
    const x0 = -50;
    G.ev = { kind: 'jump', t: 0, v, run: Math.max(v, 5), ok: v * 3.6 >= JUMP_KMH, gEff, end: 0, landed: 0, fell: 0,
      cars: cars.map(c => ({ ...c, x: x0 - c.off, y: 0, vx: 0, vy: 0, mode: 'ground', rot: 0, spin: 0 })), puffs: [], camX: x0 };
    Snd.whee();
  }
  const HR = JUMP_RAMP * Math.tan(JUMP_ANG);
  function surf(x) {
    if (x < 0) return 0;
    if (x < JUMP_RAMP) return x * Math.tan(JUMP_ANG);
    if (x < JUMP_RAMP + JUMP_GAP) return -CANYON_D;
    const xl = x - JUMP_RAMP - JUMP_GAP;
    return xl < JUMP_RAMP ? HR - xl * Math.tan(JUMP_ANG) : 0;
  }
  function updateJump(G, dt) {
    const e = G.ev, R = JUMP_RAMP, GP = JUMP_GAP;
    e.t += dt;
    for (const c of e.cars) {
      if (c.mode === 'ground') {
        const slope = c.x < R && c.x >= 0 ? JUMP_ANG : c.x >= R + GP && c.x < 2 * R + GP ? -JUMP_ANG : 0;
        c.x += e.run * Math.cos(slope) * dt; c.y = surf(c.x); c.rot = -slope;
        if (c.x >= R && c.x < R + GP) { c.mode = 'air'; c.x = R; c.y = HR; c.vx = e.run * Math.cos(JUMP_ANG); c.vy = e.run * Math.sin(JUMP_ANG); }
      } else if (c.mode === 'air') {
        c.vy -= e.gEff * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        c.rot = -Math.atan2(c.vy, c.vx) * 0.6;
        const rim = R + GP;
        if (c.x >= rim && c.y <= surf(c.x)) {
          c.mode = 'ground'; c.y = surf(c.x); e.landed++;
          for (let k = 0; k < 6; k++) e.puffs.push({ x: c.x + (Math.random() - 0.5) * c.L, y: c.y, vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 3, life: 0.9 });
          Snd.clank(); Ctl.rumble(0, 0.5, 0.5, 150); Ctl.rumble(1, 0.5, 0.5, 150);
        } else if (c.x < rim && c.y < HR - 1.2) c.mode = 'fall';
      } else if (c.mode === 'fall') {
        c.vy -= e.gEff * 2 * dt; c.x = Math.min(R + GP - c.L * 0.55, c.x + c.vx * dt); c.y += c.vy * dt;
        c.spin += dt * 2.5; c.rot = -Math.atan2(c.vy, c.vx) * 0.6 + c.spin * 0.4;
        const floor = -CANYON_D + 2 + e.fell * 1.6;
        if (c.y <= floor) {
          c.y = floor; c.mode = 'rest'; e.fell++; e.run = Math.max(e.run, 12);
          for (let k = 0; k < 8; k++) e.puffs.push({ x: c.x + (Math.random() - 0.5) * 8, y: c.y, vx: (Math.random() - 0.5) * 8, vy: 3 + Math.random() * 4, life: 1.1 });
          Snd.boom(); Ctl.rumble(0, 1, 1, 300); Ctl.rumble(1, 1, 1, 300);
        }
      }
    }
    for (const p of e.puffs) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    e.puffs = e.puffs.filter(p => p.life > 0);
    // kamera sledi sredini vlaka
    const mid = (e.cars[0].x + e.cars[e.cars.length - 1].x) / 2;
    e.camX += (mid + 18 - e.camX) * Math.min(1, dt * 3);
    const n = e.cars.length;
    if (!e.end && e.landed >= n) { e.end = e.t; G.addPoints(50); G.score.jump = 'uspel'; G.msg('JUPIII! Preskočili ste kanjon! +50', '#d9ecc4', 4); Snd.good(); }
    if (!e.end && e.fell >= n) { e.end = e.t; G.addPoints(-10); G.msg('Prepočasi! Vlak je padel v kanjon. −10', '#f3c2b2', 4); Snd.bad(); }
    if (e.end && e.t - e.end > 2.2 && !G.trans && !G.quiz) {
      if (e.landed >= n) {
        transition(() => {
          const t = G.train;
          G.mode = 'drive'; G.ev = null; G.jump.state = 'done';
          t.pos = G.jump.pos + JUMP_GAP + JUMP_RAMP + 85; World.snap();
        });
      } else {
        G.jump.tries = (G.jump.tries || 0) + 1;
        Quiz.open(G, 'jump', { max: 3, onEnd: () => transition(() => {
          const t = G.train;
          G.mode = 'drive'; G.ev = null; G.jump.state = 'idle';
          t.pos = G.jump.pos - 620; t.v = 0; t.reg = 0; t.brake = 1; World.snap();
          G.msg('Žerjav je vlak dvignil iz kanjona. Zaleti se še enkrat!', PAL.yellow, 5);
        }) });
      }
    }
  }
  function drawJump(g, G) {
    const e = G.ev, M = 9, gy = 400;
    const X = x => (x - e.camX) * M + W / 2, Y = y => gy - y * M;
    backdrop(g, e.camX * M, gy + 30, { top: '#c9b7d6', bottom: '#f4dcb5', far: '#b09aa8', hill: '#a89060', trees: false });
    // tla s plastmi skal
    const R = JUMP_RAMP, GP = JUMP_GAP;
    const rock = (x0, x1) => {
      const a = Math.max(-20, X(x0)), b = Math.min(W + 20, X(x1));
      if (b < a) return;
      inkPoly(g, [a, Y(0), b, Y(0), b, H + 10, a, H + 10], '#c79a62', 3.5, 0.8, 760 + Math.floor(x0));
      for (let k = 1; k < 5; k++) { g.fillStyle = k % 2 ? '#b5864f' : '#d6ab72'; g.fillRect(a, Y(0) + k * 48, b - a, 22); }
      g.fillStyle = PAL.grass; g.fillRect(a, Y(0) - 2, b - a, 12);
      inkLine(g, [a, Y(0) + 10, b, Y(0) + 10], 2.5, INK, 0.4);
    };
    // dno kanjona z reko
    inkPoly(g, [X(R) , Y(0), X(R + GP), Y(0), X(R + GP), H + 10, X(R), H + 10], '#6a4a34', 3, 0.8, 770);
    g.fillStyle = PAL.water; g.fillRect(X(R), Y(-CANYON_D) + 4, GP * M, 60);
    for (let k = 0; k < 5; k++) inkLine(g, [X(R) + k * 70 + 10, Y(-CANYON_D) + 14, X(R) + k * 70 + 30, Y(-CANYON_D) + 10, X(R) + k * 70 + 50, Y(-CANYON_D) + 14], 2.5, PAL.water2, 0.4, k);
    rock(e.camX - 120, R); rock(R + GP, e.camX + 120);
    // klančini (lesena ogrodja)
    const ramp = (x0, x1, up) => {
      const h0 = up ? 0 : HR, h1 = up ? HR : 0;
      inkPoly(g, [X(x0), Y(0), X(x1), Y(0), X(x1), Y(h1), X(x0), Y(h0)], '#b8865a', 3, 0.5, up ? 780 : 781);
      for (let k = 0; k <= 6; k++) { const x = lerp(x0, x1, k / 6), h = lerp(h0, h1, k / 6); inkLine(g, [X(x), Y(0), X(x), Y(h)], 2.5, PAL.woodDark, 0.3, k); }
      for (let k = 0; k < 6; k++) { const xa = lerp(x0, x1, k / 6), xb = lerp(x0, x1, (k + 1) / 6); inkLine(g, [X(xa), Y(0), X(xb), Y(lerp(h0, h1, (k + 1) / 6))], 2, PAL.woodDark, 0.3, k + 9); }
      inkLine(g, [X(x0), Y(h0) - 2, X(x1), Y(h1) - 2], 4, INK, 0.2);
    };
    ramp(0, R, true); ramp(R + GP, 2 * R + GP, false);
    sideRails(g, 0, Y(0), -20, X(0) + 1); sideRails(g, 0, Y(0), X(2 * R + GP), W + 20);
    // tabla in zastavica
    inkLine(g, [X(-14), Y(0), X(-14), Y(7)], 4); inkPoly(g, [X(-20), Y(9.6), X(-8), Y(9.6), X(-8), Y(6.8), X(-20), Y(6.8)], PAL.cream, 3, 0.4, 790);
    plainText(g, `≥ ${JUMP_KMH} km/h`, X(-14), Y(8.2), 15, PAL.red2, 'center');
    inkLine(g, [X(2 * R + GP + 8), Y(0), X(2 * R + GP + 8), Y(9)], 3);
    inkPoly(g, [X(2 * R + GP + 8), Y(9), X(2 * R + GP + 14), Y(8.2), X(2 * R + GP + 8), Y(7.4)], PAL.red, 2, 0.3, 791);
    // vagoni (od zadnjega proti lokomotivi)
    const s = M;
    for (let i = e.cars.length - 1; i >= 0; i--) {
      const c = e.cars[i];
      const a = c.mode === 'ground' || c.mode === 'air' ? c.rot : c.rot;
      carSide(g, c.type, X(c.x), Y(c.y), s, a, { spin: c.x * 0.8, dizzy: c.mode === 'rest' || c.mode === 'fall', heads: true, seed: i, mouth: c.mode === 'air' });
    }
    for (const p of e.puffs) blobs(g, [[X(p.x), Y(p.y), 8 + (1 - p.life) * 16]], '#e8d6b0', 2, Math.floor(p.x * 10));
    // napisi
    const loco = e.cars[0];
    if (loco.mode === 'air' && e.ok) burstText(g, X(loco.x) + 40, Y(loco.y) - 120, 'JUHUUU!', 1);
    if (e.fell && e.t - (e.end || e.t) < 2) burstText(g, X(R + GP / 2), Y(-CANYON_D) - 80, 'BUMF!', 1.1);
    card(g, 20, 20, 300, 70, e.ok ? '#d9ecc4' : '#f3c2b2', 795, 12);
    plainText(g, `Hitrost: ${Math.round(e.v * 3.6)} km/h`, 170, 44, 20, INK, 'center');
    plainText(g, `potrebno vsaj ${JUMP_KMH} km/h`, 170, 70, 14, e.ok ? '#2d6a2d' : PAL.red2, 'center');
    if (e.end && e.landed >= e.cars.length) burstText(g, W / 2, 200, 'PRESKOČENO!', 1.3);
  }

  // ---------- 3) razbojnik na samorogu ----------
  const DR = { gy: 610, M: 13.5, front: 1190 };
  const RG = DR.gy + 74;           // tla pred progo, kjer galopira samorog
  const foeY = d => d.y - 78;      // središče razbojnika (za zadetke)
  function startChase(G) {
    const cars = trainCars(G.train), { M, front } = DR;
    const xs = cars.map(c => ({ ...c, x: front - c.off * M }));
    const wag = xs.filter(c => c.type === 'P' || c.type === 'F');
    const last = wag[wag.length - 1], labCar = wag[Math.min(2, wag.length - 1)];
    const roofY = DR.gy - 96 * M / SIDE_U;
    G.ev = { kind: 'chase', t: 0, scroll: 0, cars: xs, roofY,
      minX: last.x - 6 * M + 18, maxX: wag[0].x + 6 * M - 18,
      weaponX: last.x - 30, labX: labCar.x, labCar: wag.indexOf(labCar),
      weapon: 'coal', loaded: false, loadT: 0, aim: 0.3, coalHits: 0, catHits: 0, hp: 3, lab: null,
      av: [{ x: wag[0].x - 40, f: -1, stun: 0, cd: 0, soot: 0, ph: 0, mv: false }, { x: last.x + 50, f: -1, stun: 0, cd: 0, soot: 0, ph: 0, mv: false }],
      d: { x: -200, y: RG, vx: 0, vy: 0, phi: -1.6, mode: 'enter', t: 0, attackT: 4, stun: 0, say: 'Ju-hu! Ustavite vlak!', sayT: 2.5, f: 1, hop: 0, hopT: 2, lasso: null, trail: [] },
      shots: [], fx: [], hint: 0, won: 0 };
  }
  function say(d, txt, t = 2) { d.say = txt; d.sayT = t; }
  function updateChase(G, dt) {
    const e = G.ev, d = e.d;
    e.t += dt; e.scroll += 340 * dt;
    d.sayT = Math.max(0, d.sayT - dt);
    d.t += dt;
    const ox = d.x, oy = d.y;
    // skoki samoroga z mavrico
    let hopH = 0;
    if (d.hop > 0) { d.hop += dt / 1.1; hopH = Math.sin(Math.PI * Math.min(1, d.hop)) * 200; if (d.hop >= 1) { d.hop = 0; d.hopT = 2.2 + Math.random() * 2; } }
    if (e.won) {
      e.won += dt;
      d.x -= 260 * dt; d.y = RG;
      if (e.won > 4.5 && !G.trans) transition(() => {
        G.mode = 'drive'; G.ev = null; G.chase.state = 'done'; World.snap();
        G.msg('Razbojnik obvisi v mreži, samorog se pase naprej.', PAL.yellow, 4); whistleTimer = 1;
      });
    } else if (d.stun > 0) {
      d.stun -= dt; d.x -= 60 * dt; d.y = RG;
    } else if (d.mode === 'enter') {
      d.x += 300 * dt; d.y = RG;
      if (d.x > 260) { d.mode = 'ride'; d.phi = Math.asin(clamp((d.x - 660) / 430, -1, 1)); }
    } else if (d.mode === 'ride') {
      d.phi += dt * 0.45;
      d.x = lerp(d.x, 660 + 430 * Math.sin(d.phi), Math.min(1, dt * 3));
      d.hopT -= dt; if (d.hopT <= 0 && !d.hop) d.hop = 0.01;
      d.y = RG - hopH;
      d.attackT -= dt;
      if (d.attackT <= 0 && !d.hop) {
        const tg = e.av.filter(a => !a.stun);
        d.tgt = tg.length ? tg[Math.floor(Math.random() * tg.length)] : e.av[0];
        d.mode = 'chase'; d.t = 0;
        say(d, ['Hej, premog je moj!', 'Ju-hu-huuu!', 'Primem te z lasom!', 'Ustavite vlak!'][Math.floor(Math.random() * 4)], 1.6);
      }
    } else if (d.mode === 'chase') {
      const side = d.tgt.x > 640 ? -1 : 1;
      d.x = lerp(d.x, d.tgt.x + side * 130, Math.min(1, dt * 2.5)); d.y = RG; d.f = -side;
      if (d.t > 1.1) {
        d.mode = 'throw'; d.t = 0; Snd.toss();
        d.lasso = { t: 0, T: 0.65, tx: d.tgt.x, ty: e.roofY - 50, tgt: d.tgt };
      }
    } else if (d.mode === 'throw') {
      d.y = RG;
      if (d.t > 1.2) { d.mode = 'ride'; d.attackT = 3.5 + Math.random() * 2.5; d.phi = Math.asin(clamp((d.x - 660) / 430, -1, 1)); }
    }
    if (d.lasso) {
      const L = d.lasso; L.t += dt;
      if (L.t >= L.T && !L.done) {
        L.done = true;
        const a = L.tgt;
        if (!a.stun && Math.abs(a.x - L.tx) < 36 && !e.won) {
          a.stun = 1.8; G.addPoints(-2); Snd.bad(); Ctl.rumble(e.av.indexOf(a), 0.7, 0.7, 250);
          G.msg(`${e.av.indexOf(a) ? 'Kurjača' : 'Strojevodjo'} je ujel z lasom! −2`, '#f3c2b2', 1.5);
        } else say(d, 'Ojoj, zgrešil!', 1.2);
      }
      if (L.t > L.T + 0.4) d.lasso = null;
    }
    d.vx = (d.x - ox) / Math.max(dt, 1e-4); d.vy = (d.y - oy) / Math.max(dt, 1e-4);
    if (d.mode !== 'chase' && d.mode !== 'throw' && !e.won && Math.abs(d.vx) > 5) d.f = Math.sign(d.vx);
    d.trail.push({ x: d.x - d.f * 40, y: d.y - 46, life: 0.7 });
    for (const p of d.trail) { p.x -= 340 * dt; p.life -= dt; }
    d.trail = d.trail.filter(p => p.life > 0);
    // igralca
    for (let i = 0; i < 2; i++) {
      const a = e.av[i], p = Ctl.p[i];
      a.stun = Math.max(0, a.stun - dt); a.soot = Math.max(0, a.soot - dt); a.cd = Math.max(0, a.cd - dt);
      if (a.stun || e.won) { a.mv = false; continue; }
      const mx = clamp(p.lx + (p.right ? 1 : 0) - (p.left ? 1 : 0), -1, 1);
      a.mv = Math.abs(mx) > 0.2;
      if (a.mv) { a.x = clamp(a.x + mx * 240 * dt, e.minX, e.maxX); a.f = Math.sign(mx); a.ph += dt * 12; }
      const atW = Math.abs(a.x - e.weaponX) < 50, atLab = Math.abs(a.x - e.labX) < 40;
      if (atW && e.weapon !== 'coal') {
        const ay = clamp(p.ly + (p.up ? 1 : 0) - (p.down ? 1 : 0), -1, 1);
        e.aim = clamp(e.aim + ay * dt * 0.9, -0.7, 1.35);
      }
      if (Ctl.pressed(i, 'y') && atLab) { enterLab(G); return; }
      if (Ctl.pressed(i, 'a') && !a.cd) {
        if (e.weapon === 'coal' || !atW) throwCoal(G, a);
        else if (!e.loaded) { if (e.loadT <= 0) { e.loadT = e.weapon === 'ballista' ? 1.0 : 0.6; e.loader = i; a.cd = e.loadT; Snd.clank(); } }
        else fire(G, a);
      }
    }
    if (e.loadT > 0) { e.loadT -= dt; if (e.loadT <= 0) { e.loaded = true; Snd.click(); } }
    // izstrelki
    for (const s of e.shots) {
      s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 8;
      if (!s.hit && !e.won && Math.hypot((s.x - d.x) / 1.2, s.y - foeY(d)) < (s.kind === 'coal' ? 55 : 66)) { s.hit = true; hit(G, s); }
    }
    e.shots = e.shots.filter(s => !s.hit && s.y < H + 50 && s.x > -100 && s.x < W + 100);
    for (const f of e.fx) f.t += dt;
    e.fx = e.fx.filter(f => f.t < 1);
    e.hint += dt;
  }
  // smer metanja: proti razbojniku
  const sideOf = (e, x) => Math.sign(e.d.x - x) || 1;
  function throwCoal(G, a) {
    const e = G.ev, d = e.d;
    const x = a.x, y = e.roofY - 60, T = clamp(Math.hypot(d.x - x, foeY(d) - y) / 650, 0.45, 1.1), g = 900;
    const tx = d.x + d.vx * T * 0.8 + (Math.random() - 0.5) * 70, ty = foeY(d) + d.vy * T * 0.6 + (Math.random() - 0.5) * 60;
    e.shots.push({ kind: 'coal', x, y, vx: (tx - x) / T, vy: (ty - y) / T - 0.5 * g * T, g, rot: 0 });
    a.cd = 0.45; a.f = sideOf(e, x); a.throwT = 0.25; Snd.toss();
    if (G.train.coal > 5) G.train.coal -= 2;
  }
  function aimVec(e) {
    const s = sideOf(e, e.weaponX);
    return e.weapon === 'ballista' ? { vx: Math.cos(e.aim) * 1300 * s, vy: -Math.sin(e.aim) * 1300, g: 180 } : { vx: Math.cos(e.aim) * 920 * s, vy: -Math.sin(e.aim) * 920, g: 900 };
  }
  function fire(G, a) {
    const e = G.ev, v = aimVec(e);
    e.shots.push({ kind: e.weapon, x: e.weaponX, y: e.roofY - 40, vx: v.vx, vy: v.vy, g: v.g, rot: Math.atan2(v.vy, v.vx) });
    e.loaded = false; a.cd = 0.4; Snd.twang();
    Ctl.rumble(G.ev.av.indexOf(a), 0.4, 0.6, 120);
  }
  function hit(G, s) {
    const e = G.ev, d = e.d;
    e.fx.push({ x: s.x, y: s.y, t: 0, text: s.kind === 'coal' ? 'BONK!' : s.kind === 'catapult' ? 'TRESK!' : 'ŽVIIIK!' });
    if (s.kind === 'coal') {
      e.coalHits++; Snd.bonk(); G.addPoints(1);
      say(d, ['Haha, žgečka!', 'To je vse?', 'Hej, moj klobuk!', 'Hihi!'][e.coalHits % 4], 1.4);
    } else if (s.kind === 'catapult') {
      e.catHits++; d.stun = 1.6; Snd.clank(); G.addPoints(5);
      say(d, e.catHits >= 2 ? 'Grrr! To me ne ustavi!' : 'AUU! Moja perjanica!', 2);
      if (e.catHits === 2) G.msg('Katapult ni dovolj! V laboratoriju razvijajo balisto.', PAL.yellow, 4);
    } else {
      e.hp--; d.stun = 2; Snd.clank(); G.addPoints(10);
      if (e.hp <= 0) {
        e.won = 0.01; d.stun = 0; d.lasso = null; G.addPoints(50); G.score.chase = true;
        say(d, 'Ujet sem! Prav, prav, vdam se!', 4.5);
        G.msg('RAZBOJNIK JE UJET! +50', '#d9ecc4', 4); Snd.good();
      } else say(d, e.hp === 2 ? 'Kaj je to?! Mreža!' : 'Ne! Še ena mreža!', 2);
    }
  }
  function enterLab(G) {
    const e = G.ev;
    if (e.weapon === 'ballista') { G.msg('Balista je že na zadnjem vagonu!', PAL.yellow, 2); return; }
    if (e.weapon === 'catapult' && e.catHits < 2) { G.msg('Najprej preizkusita katapult na razbojniku!', PAL.yellow, 2.5); return; }
    e.lab = e.weapon === 'coal' ? 'catapult' : 'ballista';
    Snd.click();
    Quiz.open(G, 'lab', { max: 3, onEnd: () => {
      e.weapon = e.lab; e.loaded = false; e.aim = 0.8;
      for (const a of e.av) a.x = e.weaponX + (a === e.av[0] ? 70 : 20);
      G.msg(e.lab === 'catapult' ? 'Katapult je na zadnjem vagonu! A naloži in izstreli, palica gor/dol meri' : 'Balista z mrežo je pripravljena! Naloži in meri v razbojnika!', '#d9ecc4', 5);
      e.lab = null; Snd.good();
    } });
  }

  function drawChaseScene(g, G) {
    const e = G.ev, d = e.d, { gy, M } = DR;
    backdrop(g, e.scroll, gy, { top: '#e7b892', bottom: '#f4e2c0', far: '#a7a08a', hill: '#879a58' });
    g.fillStyle = '#9aa860'; g.fillRect(0, gy, W, H - gy);
    sideRails(g, e.scroll, gy);
    // vlak
    for (const c of e.cars) {
      const k = e.cars.indexOf(c);
      carSide(g, c.type, c.x, gy + Math.sin(e.t * 18 + k) * 1.2, M, 0, { spin: e.scroll / 20, heads: true, seed: k, lab: k - 2 === e.labCar });
    }
    puff(g, e.cars[0].x + 3 * M, gy - 200, G.time * 2);
    const labCar = e.cars.find((c, k) => k - 2 === e.labCar);
    if (labCar) {
      const hx = e.labX, near = e.av.some(a => Math.abs(a.x - hx) < 40);
      if (near && !e.won) { bubbleSmall(g, hx, e.roofY - 120, 'Y'); }
    }
    // orožje na zadnjem vagonu
    drawWeapon(g, e);
    // namerilna črta
    if (e.weapon !== 'coal' && e.av.some(a => Math.abs(a.x - e.weaponX) < 50) && !e.won) {
      const v = aimVec(e); let x = e.weaponX, y = e.roofY - 40, vx = v.vx, vy = v.vy;
      g.fillStyle = e.loaded ? 'rgba(29,22,17,0.7)' : 'rgba(29,22,17,0.25)';
      for (let k = 0; k < 22; k++) { for (let j = 0; j < 4; j++) { vy += v.g * 0.012; x += vx * 0.012; y += vy * 0.012; } g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
    }
    // igralca
    e.av.forEach((a, i) => {
      const look = i ? P2_LOOK : P1_LOOK;
      const y = e.roofY + 2;
      drawToon(g, a.x, y, { ...look, sc: 0.95, face: a.f, phase: a.ph, moving: a.mv, mood: a.stun ? 'oh' : 'happy', soot: a.soot > 0 || look.soot, skin: a.soot > 0 ? '#b39a84' : undefined, carry: e.loadT > 0 && e.loader === i });
      if (a.stun) stars(g, a.x, y - 96, 18, G.time, 3);
      plainText(g, i ? 'P2' : 'P1', a.x, y - 108, 12, i ? PAL.teal2 : PAL.red2, 'center');
    });
    // izstrelki
    for (const s of e.shots) {
      if (s.kind === 'coal') inkEllipse(g, s.x, s.y, 8, 7, PAL.coal, 2, Math.floor(s.rot));
      else if (s.kind === 'catapult') { inkEllipse(g, s.x, s.y, 16, 14, PAL.rock, 3, 800); inkLine(g, [s.x - 6, s.y - 4, s.x + 4, s.y + 2], 2, PAL.rock2, 0.3); }
      else { g.save(); g.translate(s.x, s.y); g.rotate(Math.atan2(s.vy, s.vx)); inkLine(g, [-30, 0, 20, 0], 5, PAL.woodDark, 0.3); inkPoly(g, [20, -7, 34, 0, 20, 7], '#c8ccd0', 2, 0.3, 801); inkPoly(g, [-30, 0, -40, -8, -36, 0, -40, 8], PAL.red, 2, 0.3, 802); g.restore(); }
    }
    // razbojnik na samorogu z mavrico in lasom
    const RB = ['#e45b4a', '#f0a03a', '#f2d64a', '#6fb85a', '#4f8ad0', '#9a6ac8'];
    for (let k = 1; k < d.trail.length; k++) {
      const p0 = d.trail[k - 1], p1 = d.trail[k];
      RB.forEach((c, i) => { g.beginPath(); g.moveTo(p0.x, p0.y + i * 4); g.lineTo(p1.x, p1.y + i * 4); g.globalAlpha = Math.min(1, p1.life * 2); stroke(g, 4.5, c); });
    }
    g.globalAlpha = 1;
    drawRider(g, d.x, d.y, G.time, d.f, 1.3, { stun: d.stun > 0, net: 3 - e.hp, won: e.won, throwing: d.mode === 'throw' || d.mode === 'chase' });
    if (d.lasso) {
      const L = d.lasso, k = Math.min(1, L.t / L.T), back = L.t > L.T ? 1 - (L.t - L.T) / 0.4 : 1;
      const hx = d.x + d.f * 18 * 1.3, hy = d.y - 112 * 1.3;
      const tx = lerp(hx, L.tx, k * back), ty = lerp(hy, L.ty, k * back) - Math.sin(Math.PI * k) * 60 * back;
      g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo((hx + tx) / 2, Math.min(hy, ty) - 40, tx, ty); stroke(g, 3, '#c9a061');
      inkEllipse(g, tx, ty, 18, 10, null, 3, 812, Math.sin(G.time * 10) * 0.4);
    }
    for (const f of e.fx) burstText(g, f.x, f.y - 40, f.text, 0.6 + f.t * 0.3, PAL.yellow, 810);
    if (d.sayT > 0) World.bubble(g, d.x + d.f * 60, d.y - 130, d.say, 18);
    // HUD
    card(g, W / 2 - 360, 12, 720, 104, PAL.cream, 820, 14);
    toonText(g, e.won ? 'RAZBOJNIK JE UJET!' : 'RAZBOJNIK NA SAMOROGU!', W / 2, 40, 28, PAL.red, 'center', FONT_T, 5);
    const name = { coal: 'premog', catapult: 'katapult', ballista: 'balista' }[e.weapon];
    plainText(g, `Orožje: ${name}`, W / 2 - 330, 72, 16, INK, 'left');
    for (let k = 0; k < 3; k++) inkPoly(g, HUD.star(W / 2 + 230 + k * 36, 40, 15, 7), k < 3 - e.hp ? '#e6d6a0' : PAL.cream, 2.5, 0.4, 830 + k);
    plainText(g, 'mreže:', W / 2 + 208, 41, 13, INK, 'right');
    let tip;
    if (e.weapon === 'coal') tip = e.coalHits >= 2 || e.hint > 12 ? 'Premog ga ne ustavi! Pojdita v LABORATORIJ  (Y pri loputi)' : 'Mečita premog v razbojnika';
    else if (e.weapon === 'catapult') tip = e.catHits >= 2 ? 'Katapult ni dovolj! V LABORATORIJ po balisto  (Y)' : 'Pri katapultu: A naloži / izstreli, palica gor/dol meri';
    else tip = 'Pri balisti: A naloži / izstreli, gor/dol meri – zadenita 3×!';
    plainText(g, tip, W / 2 - 330, 96, 15, PAL.red2, 'left');
    let lx = legend(g, W / 2 + 60, 72, ['L↔'], 'hodi', 13); lx = legend(g, lx + 8, 72, ['A'], e.weapon === 'coal' ? 'vrzi' : 'vrzi/strel', 13); legend(g, lx + 8, 72, ['Y'], 'lab', 13);
  }
  function bubbleSmall(g, x, y, btn) {
    inkEllipse(g, x, y, 26, 22, PAL.white, 3, 840);
    btnGlyph(g, x, y, btn, 12);
    inkPoly(g, [x - 6, y + 20, x, y + 34, x + 6, y + 20], PAL.white, 2.5, 0.3, 841);
    plainText(g, 'LAB', x, y - 34, 13, '#6c5a8a', 'center');
  }
  function drawWeapon(g, e) {
    const x = e.weaponX, y = e.roofY;
    const ang = e.aim, s = sideOf(e, x);
    if (e.weapon === 'coal') {
      inkPoly(g, [x - 22, y, x + 22, y, x + 18, y - 22, x - 18, y - 22], '#5e4128', 3, 0.4, 850);
      blobs(g, [[x - 10, y - 24, 8], [x + 4, y - 27, 9], [x + 12, y - 22, 7]], PAL.coal, 2, 851);
      plainText(g, 'PREMOG', x, y + 14, 11, PAL.cream, 'center');
    } else if (e.weapon === 'catapult') {
      inkPoly(g, [x - 40, y, x + 40, y, x + 34, y - 14, x - 34, y - 14], PAL.wood, 3, 0.4, 852);
      for (const wx of [-26, 26]) inkEllipse(g, x + wx, y - 4, 7, 7, PAL.woodDark, 2, 853 + wx);
      inkPoly(g, [x - 8, y - 14, x + 8, y - 14, x + 2, y - 50, x - 2, y - 50], PAL.woodDark, 2.5, 0.3, 855);
      // ročica: napeta nazaj, ko je naložen, sicer kaže v smer cilja
      const px = x, py = y - 44, a = e.loaded || e.loadT > 0 ? Math.PI - 0.35 : ang;
      const dx = Math.cos(a) * s, dy = -Math.sin(a), kx = px + dx * 58, ky = py + dy * 58;
      inkLine(g, [px - dx * 16, py - dy * 16, kx, ky], 6, PAL.wood, 0.3);
      inkEllipse(g, kx, ky, 12, 8, PAL.woodDark, 2.5, 856);
      if (e.loaded) inkEllipse(g, kx, ky - 8, 12, 11, PAL.rock, 2.5, 857);
    } else {
      inkPoly(g, [x - 34, y, x + 34, y, x + 26, y - 18, x - 26, y - 18], PAL.wood, 3, 0.4, 858);
      g.save(); g.translate(x, y - 34); g.scale(s, 1); g.rotate(-ang);
      inkPoly(g, [-34, -6, 40, -6, 40, 6, -34, 6], PAL.woodDark, 2.5, 0.3, 859);
      g.beginPath(); g.moveTo(10, -36); g.quadraticCurveTo(28, 0, 10, 36); stroke(g, 6, PAL.wood);
      const pull = e.loaded ? -26 : e.loadT > 0 ? -26 * (1 - e.loadT) : 4;
      inkLine(g, [10, -36, pull, 0, 10, 36], 2, INK, 0.2);
      if (e.loaded) { inkLine(g, [pull, 0, 46, 0], 5, PAL.woodDark, 0.2); inkPoly(g, [46, -6, 58, 0, 46, 6], '#c8ccd0', 2, 0.3, 860); }
      g.restore();
      inkPoly(g, [x - 8, y - 18, x + 8, y - 18, x + 4, y - 34, x - 4, y - 34], PAL.woodDark, 2, 0.3, 861);
    }
    if (e.weapon !== 'coal') plainText(g, e.loaded ? 'NALOŽENO' : e.loadT > 0 ? 'nalagam ...' : 'prazno – A', x, y + 16, 12, e.loaded ? '#d9ecc4' : PAL.cream, 'center');
  }
  // laboratorij s tablo (med računi za načrt)
  function drawLab(g, G) {
    const q = G.quiz, e = G.ev;
    g.fillStyle = '#7a5232'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 64) inkLine(g, [x, 0, x, H], 2, '#5e3b22', 0.4, x);
    // okno z razbojnikom
    inkEllipse(g, 120, 130, 80, 80, '#e7b892', 6, 870);
    g.save(); g.beginPath(); g.arc(120, 130, 76, 0, 7); g.clip();
    blobs(g, [[80, 190, 40], [160, 200, 50]], '#879a58', 2, 871);
    drawRider(g, 120 + Math.sin(G.time * 1.3) * 50, 190 - Math.abs(Math.sin(G.time * 2.6)) * 30, G.time, Math.cos(G.time * 1.3) > 0 ? 1 : -1, 0.5, {});
    g.restore();
    inkLine(g, [44, 130, 196, 130], 4, '#5e3b22', 0.3); inkLine(g, [120, 54, 120, 206], 4, '#5e3b22', 0.3);
    // police z bučkami
    inkLine(g, [40, 330, 210, 330], 7, PAL.woodDark, 0.3); inkLine(g, [W - 210, 300, W - 40, 300], 7, PAL.woodDark, 0.3);
    [['#e48ab8', 70], ['#9ad0f0', 120], ['#c8f0a8', 170]].forEach(([c, x], k) => {
      inkPoly(g, [x - 16, 326, x + 16, 326, x + 6, 290, x + 6, 270, x - 6, 270, x - 6, 290], c, 2.5, 0.4, 872 + k);
      const b = (G.time * 0.8 + k * 0.3) % 1; inkEllipse(g, x, 266 - b * 40, 4 + b * 4, 4 + b * 4, c, 1.5, 875 + k);
    });
    for (let k = 0; k < 3; k++) { const x = W - 180 + k * 50; inkEllipse(g, x, 280, 16, 20, ['#f0c84a', '#e45b4a', '#6fb85a'][k], 2.5, 878 + k); }
    // tabla
    const bx = 250, by = 40, bw = 780, bh = 430;
    inkPoly(g, [bx - 14, by - 14, bx + bw + 14, by - 14, bx + bw + 14, by + bh + 14, bx - 14, by + bh + 14], PAL.wood, 4, 0.6, 880);
    inkPoly(g, [bx, by, bx + bw, by, bx + bw, by + bh, bx, by + bh], '#2f4a3a', 3, 0.5, 881);
    const chalk = '#f2efe4';
    const name = e && e.lab === 'ballista' ? 'BALISTA' : 'KATAPULT';
    plainText(g, `NAČRT: ${name}${name === 'BALISTA' ? '  (v razvoju)' : ''}`, bx + 30, by + 36, 26, chalk, 'left');
    // skica s kredo
    g.save(); g.translate(bx + 170, by + 230); g.strokeStyle = chalk; g.lineWidth = 3; g.lineCap = 'round';
    const L = (pts) => { g.beginPath(); for (let i = 0; i < pts.length; i += 2) i ? g.lineTo(pts[i] + jit(i + pts[0], 1), pts[i + 1] + jit(i + 9, 1)) : g.moveTo(pts[i], pts[i + 1]); g.stroke(); };
    const progress = q.done + (q.solvedT > 0 && !q.revealed ? 0 : 0);
    if (name === 'KATAPULT') {
      L([-110, 60, 110, 60]); L([-90, 60, -90, 80]); L([90, 60, 90, 80]);
      g.beginPath(); g.arc(-80, 80, 16, 0, 7); g.arc(80, 80, 16, 0, 7); g.stroke();
      if (progress >= 1) { L([-20, 60, 0, -20, 20, 60]); L([-30, 20, 30, 20]); }
      if (progress >= 2) { L([0, -20, -90, -100]); g.beginPath(); g.arc(-100, -108, 18, 0, 7); g.stroke(); }
      if (progress >= 3) { L([60, -80, 90, -120, 120, -80]); plainText(g, '45°', 30, -60, 18, chalk, 'center'); }
    } else {
      L([-120, 50, 120, 50]); g.beginPath(); g.arc(-90, 70, 16, 0, 7); g.arc(90, 70, 16, 0, 7); g.stroke();
      if (progress >= 1) { L([-100, 0, 110, 0]); L([-100, 10, 110, 10]); }
      if (progress >= 2) { g.beginPath(); g.moveTo(60, -80); g.quadraticCurveTo(110, 5, 60, 90); g.stroke(); L([60, -80, -60, 5, 60, 90]); }
      if (progress >= 3) { L([-60, 5, 150, 5]); L([140, -5, 160, 5, 140, 15]); plainText(g, '+ mreža', 120, -40, 18, chalk, 'center'); }
    }
    g.restore();
    plainText(g, `${q.done}/3 delov načrta`, bx + 170, by + bh - 24, 16, chalk, 'center');
    // računi na tabli
    const rx = bx + 360;
    for (let k = 0; k < 3; k++) {
      const done = k < q.done, cur = k === q.done;
      plainText(g, `${k + 1}.`, rx, by + 92 + k * 34, 20, chalk, 'left');
      plainText(g, done ? '✔ rešeno' : cur ? '← reši zdaj' : '…', rx + 34, by + 92 + k * 34, 20, done ? '#c8f0a8' : chalk, 'left');
    }
    g.font = `bold 28px ${FONT}`;
    const lines = Quiz.wrap(g, q.text, bw - 400);
    lines.forEach((l, i) => plainText(g, l, rx, by + 220 + i * 36, 28, chalk, 'left'));
    if (q.msg) plainText(g, q.msg, rx, by + bh - 30, 18, q.msgCol === INK ? chalk : q.msgCol === '#2d6a2d' ? '#c8f0a8' : '#f3b0a0', 'left');
    // kolesca in znanstvenika
    Quiz.wheels(g, q, W / 2, 498);
    drawToon(g, 150, 690, { ...P1_LOOK, sc: 1.7, face: 1, mood: q.shake > 0 ? 'oh' : 'happy', wave: q.solvedT > 0 });
    drawToon(g, W - 150, 690, { ...P2_LOOK, sc: 1.7, face: -1, mood: q.shake > 0 ? 'oh' : 'happy', wave: q.solvedT > 0 });
    let lx = legend(g, W / 2 - 230, 690, ['L↕'], 'številka', 15, PAL.cream);
    lx = legend(g, lx + 24, 690, ['L↔'], 'premik', 15, PAL.cream); legend(g, lx + 24, 690, ['A'], 'potrdi (oba lahko)', 15, PAL.cream);
  }

  // ---------- 4) zmaj in vodna brizgalna ----------
  // strojevodja črpa vodo (palica gor-dol), kurjač meri z brizgalno; ko vlak zapelje v predor, je zmaja konec
  const FR = { gy: 600, M: 13.5, front: 1190, passes: 6, fbG: 200 };
  function startFire(G) {
    const cars = trainCars(G.train), { M, front } = FR;
    const xs = cars.map(c => ({ ...c, x: front - c.off * M, burn: 0 }));
    const wag = xs.filter(c => c.type === 'P' || c.type === 'F');
    const roofY = FR.gy - 96 * M / SIDE_U;
    G.ev = { kind: 'fire', t: 0, scroll: 0, cars: xs, roofY,
      pumpX: wag[0].x - 10, hoseX: wag[Math.min(2, wag.length - 1)].x + 10,
      press: 0.4, pumpDir: 0, handle: 0, aim: 0.7, spraying: false, drops: [], balls: [], steam: [], fx: [],
      pass: 0, tunnel: null, done: 0, doused: 0, burnPts: 0, sneezes: 0,
      d: { x: -300, y: 170, y0: 170, f: 1, dir: 1, mode: 'wait', t: 0, queue: [], say: 'Grrr! Zdaj ste moji!', sayT: 2.5, wet: 0, sneeze: false, spitT: 0, fall: 0 } };
  }
  // strojevodja črpa (palica gor-dol), kurjač meri brizgalno (palica) in brizga (A ali RT)
  function pumpAndHose(G, e, dt) {
    const p1 = Ctl.p[0], p2 = Ctl.p[1];
    const ly = clamp(p1.ly + (p1.up ? 1 : 0) - (p1.down ? 1 : 0), -1, 1);
    e.handle = lerp(e.handle, ly, Math.min(1, dt * 14));
    if (ly > 0.6 && e.pumpDir !== 1) { e.pumpDir = 1; e.press = Math.min(1, e.press + 0.08); Snd.pump(); }
    if (ly < -0.6 && e.pumpDir !== -1) { e.pumpDir = -1; e.press = Math.min(1, e.press + 0.08); Snd.pump(); }
    // brizgalna: palica pokaže smer, A ali RT brizga
    const vx = p2.lx + (p2.right ? 1 : 0) - (p2.left ? 1 : 0), vy = p2.ly + (p2.up ? 1 : 0) - (p2.down ? 1 : 0);
    if (Math.hypot(vx, vy) > 0.35) {
      const want = Math.atan2(vy, vx);
      let da = want - e.aim; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      e.aim += clamp(da, -dt * 4, dt * 4);
    }
    e.spraying = (p2.a || p2.rt > 0.3) && e.press > 0.04 && !e.done;
    const nx = e.hoseX + Math.cos(e.aim) * 44, ny = e.roofY - 52 - Math.sin(e.aim) * 44;
    if (e.spraying) {
      e.press = Math.max(0, e.press - dt * 0.3);
      const sp = 480 + 460 * e.press;
      for (let k = 0; k < 3; k++) {
        const a = e.aim + (Math.random() - 0.5) * 0.08;
        e.drops.push({ x: nx, y: ny, vx: Math.cos(a) * sp, vy: -Math.sin(a) * sp, life: 1.6 });
      }
      if (G.train.water > 1) G.train.water -= dt * 0.02;
    }
  }
  function drawRig(g, e) {
    const px = e.pumpX, py = e.roofY;
    inkPoly(g, [px + 34, py, px + 86, py, px + 86, py - 40, px + 34, py - 40], '#6a8ab0', 3, 0.5, 940);
    inkLine(g, [px + 34, py - 20, px + 86, py - 20], 2, '#4a6a90', 0.3);
    plainText(g, 'VODA', px + 60, py - 30, 11, PAL.cream, 'center');
    inkPoly(g, [px - 8, py, px + 8, py, px + 4, py - 46, px - 4, py - 46], PAL.woodDark, 2.5, 0.3, 941);
    const la = e.handle * 0.5, lx0 = px - Math.cos(la) * 26, ly0 = py - 46 + Math.sin(la) * 26, lx1 = px + Math.cos(la) * 60, ly1 = py - 46 - Math.sin(la) * 60;
    inkLine(g, [lx0, ly0, lx1, ly1], 6, PAL.wood, 0.3);
    inkEllipse(g, px, py - 46, 6, 6, PAL.brass, 2, 942);
    inkLine(g, [px + 86, py - 6, (px + e.hoseX) / 2, py - 2, e.hoseX - 10, py - 10], 5, '#4a4038', 0.5, 943);
    // brizgalna
    const hx = e.hoseX, hy = e.roofY - 52;
    inkPoly(g, [hx - 18, py, hx + 18, py, hx + 10, py - 30, hx - 10, py - 30], PAL.red2, 3, 0.4, 944);
    g.save(); g.translate(hx, hy); g.rotate(-e.aim);
    inkPoly(g, [-10, -9, 44, -6, 44, 6, -10, 9], PAL.brass, 3, 0.4, 945);
    inkEllipse(g, 44, 0, 4, 7, '#a07a2a', 2, 946);
    g.restore();
    // igralca: strojevodja pri ročici, kurjač za brizgalno
    const t1 = px + 104, t2 = hx - 52;
    drawToon(g, t1, e.roofY + 2, { ...P1_LOOK, sc: 0.95, face: -1, mood: e.press < 0.15 ? 'oh' : 'happy', hand: [(lx1 - t1) / 0.95, (ly1 - e.roofY - 2) / 0.95] });
    drawToon(g, t2, e.roofY + 2, { ...P2_LOOK, sc: 0.95, face: 1, mood: e.cars.some(c => c.burn > 0) || (e.spots && e.spots.some(f => f.burn > 0)) ? 'oh' : 'happy', hand: [(hx - 6 - t2) / 0.95, (hy - e.roofY - 2) / 0.95] });
    plainText(g, 'P1 črpa', t1, e.roofY - 108, 12, PAL.red2, 'center');
    plainText(g, 'P2 brizga', t2, e.roofY - 108, 12, PAL.teal2, 'center');
  }
  function updateFire(G, dt) {
    const e = G.ev, d = e.d;
    e.t += dt; e.scroll += 340 * dt;
    d.t += dt; d.sayT = Math.max(0, d.sayT - dt); d.spitT = Math.max(0, d.spitT - dt);
    pumpAndHose(G, e, dt);
    // zmaj: preleti čez vlak in pljuva ognjene krogle
    if (d.mode === 'wait') {
      if (d.t > (e.pass ? 1.4 : 2.4)) {
        if (e.pass < FR.passes) {
          d.dir = e.pass % 2 ? -1 : 1; d.f = d.dir; d.mode = 'pass'; d.t = 0;
          d.x = d.dir > 0 ? -160 : W + 160; d.y0 = 130 + Math.random() * 70;
          const burnable = e.cars.filter(c => c.type !== 'loco');
          const pick = [...burnable].sort(() => Math.random() - 0.5).slice(0, e.pass < 2 ? 2 : 3);
          d.queue = pick.map(c => c.x).sort((a, b) => d.dir * (a - b));
          if (e.pass === 2) say(d, 'Hrrr! Še bolj vroče!', 1.6);
        } else if (!e.balls.length) {
          e.tunnel = { x: W + 260 }; d.mode = 'final'; d.t = 0; d.dir = 1; d.f = 1; d.x = -160; d.y0 = 300;
          say(d, 'Ne uidete mi!', 2);
          G.msg('Predor je blizu – zdržita še malo!', PAL.yellow, 3);
        }
      }
    } else if (d.mode === 'pass') {
      d.x += d.dir * 300 * dt; d.y = d.y0 + Math.sin(d.t * 3) * 30;
      const q = d.queue[0];
      if (q !== undefined && d.dir * (d.x - (q - d.dir * 200)) >= 0) {
        d.queue.shift();
        if (d.sneeze) { d.sneeze = false; say(d, 'Apčiha! Ugasnil sem!', 1.4); }
        else {
          const mx = d.x + d.f * 96 * 1.3, my = d.y - 40 * 1.3, T = 1.1;
          const tx = q + (Math.random() - 0.5) * 50, ty = e.roofY - 12;
          e.balls.push({ x: mx, y: my, vx: (tx - mx) / T, vy: (ty - my) / T - 0.5 * FR.fbG * T, r: 18 });
          d.spitT = 0.5; Snd.fire();
        }
      }
      if ((d.dir > 0 && d.x > W + 180) || (d.dir < 0 && d.x < -180)) { e.pass++; d.mode = 'wait'; d.t = 0; }
    } else if (d.mode === 'final') {
      d.x += 250 * dt; d.y = d.y0 + Math.sin(d.t * 3) * 20;
      if (e.tunnel && d.x + 110 > e.tunnel.x) {
        d.mode = 'bonk'; d.t = 0; Snd.bonk(); Snd.clank();
        e.fx.push({ x: d.x + 60, y: d.y - 40, t: 0, text: 'BONK!' });
        say(d, 'Auuu! Kdo je postavil goro?!', 2.5); G.addPoints(10);
      }
    } else if (d.mode === 'bonk') {
      d.fall += dt; d.x -= 80 * dt; d.y += 160 * dt * Math.min(1, d.fall);
    }
    if (e.tunnel) {
      e.tunnel.x -= 340 * dt;
      if (e.tunnel.x < 140 && !e.done) {
        e.done = 0.01;
        const burning = e.cars.filter(c => c.burn > 0).length;
        if (!burning) { G.addPoints(20); G.msg('Vlak je cel! +20', '#d9ecc4', 4); }
        else G.msg(`V predor ste pripeljali ${burning} ${burning === 1 ? 'goreč vagon' : 'goreče vagone'}.`, '#f3c2b2', 4);
        G.score.fire = e.doused;
      }
    }
    if (e.done) {
      e.done += dt;
      if (e.done > 1.2 && !G.trans) transition(() => {
        const t = G.train;
        G.mode = 'drive'; G.ev = null; G.dragon.state = 'done';
        t.pos = G.dragon.tunnel + 12; World.snap();
        G.msg('Zmaj je ostal pred predorom. Uf!', PAL.yellow, 3);
      });
    }
    // ognjene krogle
    for (const b of e.balls) {
      b.vy += FR.fbG * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y >= e.roofY - 12) {
        b.dead = true;
        const c = e.cars.find(c => c.type !== 'loco' && Math.abs(b.x - c.x) < c.L * FR.M / 2);
        if (c) { if (!c.burn) G.msg('Vagon gori! Pogasi ga!', '#f3c2b2', 1.6); c.burn = Math.max(c.burn, 1); Snd.bad(); Ctl.rumble(0, 0.5, 0.5, 200); Ctl.rumble(1, 0.5, 0.5, 200); }
      }
    }
    // voda
    const hitCar = (x, y) => e.cars.find(c => c.burn > 0 && Math.abs(x - c.x) < c.L * FR.M / 2 && y > e.roofY - 70 && y < FR.gy);
    for (const w of e.drops) {
      w.vy += 700 * dt; w.x += w.vx * dt; w.y += w.vy * dt; w.life -= dt;
      for (const b of e.balls) if (!b.dead && Math.hypot(w.x - b.x, w.y - b.y) < b.r + 10) {
        b.dead = true; w.life = 0; e.doused++; G.addPoints(3); Snd.splash();
        for (let k = 0; k < 5; k++) e.steam.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, life: 0.9 });
      }
      if (w.life > 0 && (d.mode === 'pass' || d.mode === 'final') && Math.hypot((w.x - d.x) / 1.4, w.y - (d.y - 20)) < 48) {
        w.life = 0; d.wet++;
        if (d.wet >= 14) { d.wet = 0; d.sneeze = true; e.sneezes++; G.addPoints(5); say(d, 'Pššš! Moker sem!', 1.4); e.fx.push({ x: d.x, y: d.y - 60, t: 0, text: 'PŠŠŠ!' }); }
      }
      const c = w.life > 0 && hitCar(w.x, w.y);
      if (c) {
        w.life = 0; c.burn -= 0.04;
        if (c.burn <= 0) { c.burn = 0; G.addPoints(2); G.msg('Pogašeno! +2', '#d9ecc4', 1.4); for (let k = 0; k < 6; k++) e.steam.push({ x: c.x + (Math.random() - 0.5) * 80, y: e.roofY - 20, vx: (Math.random() - 0.5) * 60, vy: -80, life: 1 }); }
      }
      if (w.y > FR.gy + 30) w.life = 0;
    }
    e.drops = e.drops.filter(w => w.life > 0);
    e.balls = e.balls.filter(b => !b.dead && b.y < H && b.x > -100 && b.x < W + 100);
    for (const s of e.steam) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    e.steam = e.steam.filter(s => s.life > 0);
    // goreči vagoni se razplamtijo in stanejo točke
    for (const c of e.cars) if (c.burn > 0) {
      c.burn = Math.min(3, c.burn + dt * 0.18);
      e.burnPts += dt * c.burn * 0.5;
    }
    while (e.burnPts >= 1) { e.burnPts -= 1; G.addPoints(-1); }
    for (const f of e.fx) f.t += dt;
    e.fx = e.fx.filter(f => f.t < 1);
  }
  function drawFireScene(g, G) {
    const e = G.ev, d = e.d, { gy, M } = FR;
    backdrop(g, e.scroll, gy, { top: '#b9d3e0', bottom: '#f1e6c8', far: '#9fa9a8', hill: '#7f9a5c' });
    g.fillStyle = '#93a65e'; g.fillRect(0, gy, W, H - gy);
    // Soča pod progo
    g.fillStyle = '#5ec2bd'; g.fillRect(0, gy + 52, W, 70);
    inkLine(g, [0, gy + 52, W, gy + 52], 3, INK, 0.3);
    for (let k = 0; k < 9; k++) { const x = ((k * 160 - e.scroll * 0.9) % (W + 160) + W + 160) % (W + 160) - 80; inkLine(g, [x, gy + 80, x + 20, gy + 75, x + 40, gy + 80], 2.5, '#a6e2da', 0.4, k); }
    sideRails(g, e.scroll, gy);
    // vhod v predor (temen lok) – za vlakom
    const tn = e.tunnel;
    if (tn) inkPoly(g, [tn.x, gy, tn.x, gy - 120, tn.x + 30, gy - 160, tn.x + 140, gy - 160, tn.x + 170, gy - 120, tn.x + 170, gy], '#15100c', 3, 0.5, 900);
    // vlak in plameni
    e.cars.forEach((c, k) => carSide(g, c.type, c.x, gy + Math.sin(e.t * 18 + k) * 1.2, M, 0, { spin: e.scroll / 20, heads: true, seed: k }));
    puff(g, e.cars[0].x + 3 * M, gy - 200, G.time * 2);
    for (const c of e.cars) if (c.burn > 0) {
      const n = 3 + Math.floor(c.burn * 2), half = c.L * M / 2;
      for (let k = 0; k < n; k++) {
        const fx = c.x - half + 10 + (k + 0.5) / n * (half * 2 - 20), fl = Math.sin(G.time * 14 + k * 2);
        const sz = 10 + c.burn * 7 + fl * 3;
        inkPoly(g, [fx - sz * 0.6, e.roofY - 8, fx - sz * 0.25, e.roofY - 8 - sz * 1.2, fx, e.roofY - 8 - sz * 2 - fl * 4, fx + sz * 0.3, e.roofY - 8 - sz * 1.1, fx + sz * 0.6, e.roofY - 8], '#f0902a', 2.5, 0.6, 910 + k);
        inkPoly(g, [fx - sz * 0.3, e.roofY - 8, fx, e.roofY - 8 - sz, fx + sz * 0.3, e.roofY - 8], PAL.yellow, 0, 0.4, 920 + k);
      }
      const q = (G.time * 0.6) % 1; blobs(g, [[c.x - q * 60, e.roofY - 70 - q * 90, 14 + q * 20]], '#6a625a', 2.5, 930);
    }
    drawRig(g, e);
    // voda, para, ognjene krogle
    g.fillStyle = '#7fc6e6';
    for (const w of e.drops) { g.beginPath(); g.arc(w.x, w.y, 4, 0, 7); g.fill(); }
    for (const s of e.steam) blobs(g, [[s.x, s.y, 8 + (1 - s.life) * 18]], PAL.white, 2, Math.floor(s.x));
    for (const b of e.balls) { fireBlob(g, b.x, b.y, b.r + Math.sin(G.time * 20) * 2, 950); inkEllipse(g, b.x, b.y, b.r * 0.45, b.r * 0.45, PAL.yellow, 0, 951); }
    // zmaj
    if (d.mode !== 'wait' || d.x > -150 && d.x < W + 150) drawDragonFly(g, d.x, d.y, G.time, d.f, 1.3, { breath: d.spitT > 0, stun: d.mode === 'bonk', angry: d.mode === 'final' });
    // gora s predorom pokrije vlak, ki je že notri
    if (tn) {
      const ax = tn.x + 170;
      g.save();
      inkPoly(g, [ax, gy + 20, ax, gy - 120, tn.x + 140, gy - 160, tn.x + 30, gy - 160, tn.x, gy - 120, tn.x - 60, gy - 200, tn.x + 80, gy - 420, tn.x + 300, gy - 560, W + 900, gy - 600, W + 900, gy + 20], '#8a9a62', 4, 1, 960);
      inkPoly(g, [tn.x - 4, gy, tn.x - 4, gy - 124, tn.x + 30, gy - 168, tn.x + 140, gy - 168, tn.x + 176, gy - 124, tn.x + 176, gy, tn.x + 166, gy, tn.x + 166, gy - 118, tn.x + 138, gy - 152, tn.x + 32, gy - 152, tn.x + 8, gy - 118, tn.x + 8, gy], '#b5a994', 3, 0.5, 961);
      inkPoly(g, [tn.x + 160, gy - 420, tn.x + 300, gy - 560, tn.x + 420, gy - 430], PAL.snow, 3, 0.6, 962);
      g.restore();
    }
    for (const f of e.fx) burstText(g, f.x, f.y - 40, f.text, 0.6 + f.t * 0.3, PAL.yellow, 970);
    if (d.sayT > 0 && d.x > -100 && d.x < W + 100) World.bubble(g, d.x + d.f * 60, d.y - 130, d.say, 18);
    // HUD
    card(g, W / 2 - 380, 12, 760, 104, PAL.cream, 980, 14);
    toonText(g, tn ? 'NAPREJ V PREDOR!' : 'ZMAJ NAPADA – GASITA!', W / 2, 40, 28, PAL.red, 'center', FONT_T, 5);
    plainText(g, `prelet ${Math.min(e.pass + (d.mode === 'pass' ? 1 : 0), FR.passes)}/${FR.passes}`, W / 2 - 350, 40, 15, INK, 'left');
    plainText(g, `pogašene krogle: ${e.doused}`, W / 2 + 350, 40, 15, INK, 'right');
    // tlak vode
    plainText(g, 'TLAK VODE', W / 2 - 350, 72, 13, INK, 'left');
    inkPoly(g, [W / 2 - 270, 64, W / 2 - 120, 64, W / 2 - 120, 80, W / 2 - 270, 80], PAL.white, 2.5, 0.3, 981);
    g.fillStyle = e.press > 0.3 ? '#7fc6e6' : '#e58a74'; g.fillRect(W / 2 - 268, 66, 146 * e.press, 12);
    let lx = legend(g, W / 2 - 100, 72, ['L↕'], 'P1: gor-dol = črpaj', 13);
    lx = legend(g, lx + 14, 72, ['L↔', 'L↕'], 'P2: meri', 13); legend(g, lx + 10, 72, ['A'], 'brizgaj', 13);
    const burning = e.cars.filter(c => c.burn > 0).length;
    plainText(g, burning ? `Gori ${burning} ${burning === 1 ? 'vagon' : 'vagona'} – usmeri vodo na plamene!` : e.press < 0.2 ? 'Ni tlaka – P1 naj hitro črpa!' : 'Zadenita ognjene krogle, preden padejo na vlak!', W / 2, 100, 15, burning || e.press < 0.2 ? PAL.red2 : '#2d6a2d', 'center');
  }

  // ---------- 5) goreča hiša ----------
  // vlak stoji ob hiši; ista črpalka in brizgalna kot pri zmaju, plameni se širijo, dokler jih ne pogasita
  const BZ = { gy: 600, M: 13.5, front: 700, hx0: 790, hx1: 1170, top: 250 };
  function startBlaze(G) {
    const cars = trainCars(G.train), { M, front } = BZ;
    const xs = cars.map(c => ({ ...c, x: front - c.off * M, burn: 0 }));
    const wag = xs.filter(c => c.type === 'P' || c.type === 'F');
    const roofY = BZ.gy - 96 * M / SIDE_U;
    const spots = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) spots.push({ x: BZ.hx0 + 70 + c * 120, y: BZ.gy - 60 - r * 110, burn: 0, win: true, who: (r * 3 + c) % 4 });
    spots.push({ x: 900, y: BZ.top - 40, burn: 0 }, { x: 1060, y: BZ.top - 40, burn: 0 }, { x: 980, y: BZ.top - 110, burn: 0 });
    for (const k of [1, 3, 5, 7, 9, 10]) spots[k].burn = 1.2 + Math.random() * 1.5;
    G.ev = { kind: 'blaze', t: 0, scroll: 0, cars: xs, roofY, spots,
      pumpX: wag[Math.min(1, wag.length - 1)].x - 10, hoseX: wag[0].x + 60,
      press: 0.5, pumpDir: 0, handle: 0, aim: 0.45, spraying: false, drops: [], steam: [], fx: [], done: 0, time: 0 };
  }
  function updateBlaze(G, dt) {
    const e = G.ev;
    e.t += dt;
    pumpAndHose(G, e, dt);
    if (!e.done) e.time = e.t;
    for (const w of e.drops) {
      w.vy += 700 * dt; w.x += w.vx * dt; w.y += w.vy * dt; w.life -= dt;
      for (const f of e.spots) if (f.burn > 0 && Math.hypot(w.x - f.x, w.y - (f.y - 14)) < 42) {
        w.life = 0; f.burn -= 0.022;
        if (f.burn <= 0) {
          f.burn = 0; G.addPoints(2); Snd.splash();
          for (let k = 0; k < 6; k++) e.steam.push({ x: f.x + (Math.random() - 0.5) * 40, y: f.y - 20, vx: (Math.random() - 0.5) * 60, vy: -90, life: 1 });
        }
        break;
      }
      if (w.y > BZ.gy + 30) w.life = 0;
    }
    e.drops = e.drops.filter(w => w.life > 0);
    for (const s of e.steam) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    e.steam = e.steam.filter(s => s.life > 0);
    // plameni rastejo in preskočijo na sosednja okna
    for (const f of e.spots) if (f.burn > 0) {
      f.burn = Math.min(3, f.burn + dt * 0.1);
      if (f.burn > 2.4 && Math.random() < dt * 0.12) {
        const n = e.spots.filter(o => o !== f && !o.burn && Math.hypot(o.x - f.x, o.y - f.y) < 170);
        if (n.length) n[Math.floor(Math.random() * n.length)].burn = 0.6;
      }
    }
    if (!e.done && e.spots.every(f => !f.burn)) {
      e.done = 0.01;
      const p = e.time < 40 ? 60 : e.time < 70 ? 40 : 20;
      G.addPoints(p); G.score.blaze = e.time;
      G.msg(`Požar pogašen v ${e.time.toFixed(0)} s! +${p}`, '#d9ecc4', 4); Snd.good(); whistleTimer = 0.6;
    }
    if (e.done) {
      e.done += dt;
      if (e.done > 4 && !G.trans) transition(() => {
        G.mode = 'drive'; G.ev = null; G.blaze.state = 'done'; World.snap();
        G.msg('Vaščani mahajo gasilcem s parnega vlaka!', PAL.yellow, 4); whistleTimer = 1;
      });
    }
    for (const f of e.fx) f.t += dt;
    e.fx = e.fx.filter(f => f.t < 1);
  }
  function drawBlaze(g, G) {
    const e = G.ev, { gy, M, hx0, hx1, top } = BZ;
    backdrop(g, 0, gy, { top: '#e9c49a', bottom: '#f4e7c5', far: '#b0a890', hill: '#a4a060', trees: false });
    g.fillStyle = '#b9ae6a'; g.fillRect(0, gy, W, H - gy);
    // vinogradi v ozadju
    for (let k = 0; k < 14; k++) { const x = 20 + k * 92; inkLine(g, [x, gy - 4, x, gy - 40], 3, PAL.woodDark, 0.3, k); blobs(g, [[x, gy - 44, 14], [x + 14, gy - 38, 10]], PAL.leaf, 2, 990 + k); }
    sideRails(g, 0, gy);
    // hiša
    const smoke = e.spots.reduce((a, f) => a + f.burn, 0);
    for (let k = 0; k < Math.min(6, Math.ceil(smoke)); k++) { const q = (G.time * 0.3 + k / 6) % 1; blobs(g, [[980 + Math.sin(k * 3) * 120 - q * 80, top - 120 - q * 200, 26 + q * 40]], '#5a524a', 3, 1000 + k); }
    inkPoly(g, [hx0, gy, hx1, gy, hx1, top, hx0, top], '#e8d6b0', 4, 0.8, 1010);
    inkPoly(g, [hx0 - 24, top + 4, (hx0 + hx1) / 2, top - 150, hx1 + 24, top + 4], PAL.roof, 4, 0.8, 1011);
    inkPoly(g, [1090, top - 70, 1120, top - 70, 1120, top - 130, 1090, top - 130], '#8a5a43', 3, 0.5, 1012);
    inkPoly(g, [945, gy, 1015, gy, 1015, gy - 110, 945, gy - 110], PAL.woodDark, 3, 0.5, 1013);
    plainText(g, 'GOSTILNA', (hx0 + hx1) / 2, top + 30, 20, PAL.red2, 'center', FONT_T);
    for (const f of e.spots) if (f.win) {
      const sooty = f.burn > 0;
      inkPoly(g, [f.x - 34, f.y, f.x + 34, f.y, f.x + 34, f.y - 70, f.x - 34, f.y - 70], sooty ? '#3a2a20' : '#f6e8bf', 3, 0.4, 1020 + f.x);
      inkLine(g, [f.x, f.y, f.x, f.y - 70], 2.5, INK, 0.3); inkLine(g, [f.x - 34, f.y - 35, f.x + 34, f.y - 35], 2.5, INK, 0.3);
      if (f.who === 0 && !(f.y > gy - 100 && f.x > 940 && f.x < 1020)) {
        // vaščan v oknu
        const hy = f.y - 30 - (e.done ? Math.abs(Math.sin(G.time * 8)) * 6 : 0);
        inkEllipse(g, f.x + 10, hy, 12, 12, PAL.skin, 2.5, 1030 + f.x);
        pieEye(g, f.x + 6, hy - 2, 3, 0, 0, false, 1031); pieEye(g, f.x + 14, hy - 2, 3, 0, 0, false, 1032);
        inkEllipse(g, f.x + 10, hy + 6, 3, sooty ? 4 : 2, '#6a2a22', 1.5, 1033);
        inkEllipse(g, f.x + 26, hy - 10 + Math.sin(G.time * 12) * 4, 5, 5, PAL.white, 2, 1034);
      }
    }
    // plameni
    for (const f of e.spots) if (f.burn > 0) {
      const sz = 14 + f.burn * 10;
      for (let k = -1; k <= 1; k++) {
        const fl = Math.sin(G.time * 13 + k * 2 + f.x);
        const x = f.x + k * sz * 0.6, b = f.y - 4, h = sz * (k ? 1.4 : 2) + fl * 5;
        inkPoly(g, [x - sz * 0.5, b, x - sz * 0.2, b - h * 0.6, x, b - h, x + sz * 0.25, b - h * 0.55, x + sz * 0.5, b], '#f0902a', 2.5, 0.6, 1040 + k);
        inkPoly(g, [x - sz * 0.25, b, x, b - h * 0.5, x + sz * 0.25, b], PAL.yellow, 0, 0.4, 1043 + k);
      }
    }
    // vlak (zadnji vagoni so izven slike)
    e.cars.forEach((c, k) => { if (c.x > -120) carSide(g, c.type, c.x, gy, M, 0, { heads: true, seed: k }); });
    puff(g, e.cars[0].x + 3 * M, gy - 200, G.time);
    drawRig(g, e);
    g.fillStyle = '#7fc6e6';
    for (const w of e.drops) { g.beginPath(); g.arc(w.x, w.y, 4, 0, 7); g.fill(); }
    for (const s of e.steam) blobs(g, [[s.x, s.y, 8 + (1 - s.life) * 18]], PAL.white, 2, Math.floor(s.x));
    if (!e.done && e.t < 3) World.bubble(g, 1000, top - 190, 'Na pomoč! Gori!', 20);
    if (e.done) { World.bubble(g, 1000, top - 190, 'Hvala, gasilci!', 22); burstText(g, W / 2, 200, 'POGAŠENO!', 1.2); }
    // HUD
    card(g, W / 2 - 380, 12, 760, 104, PAL.cream, 1050, 14);
    toonText(g, e.done ? 'POŽAR JE POGAŠEN!' : 'GORI GOSTILNA!', W / 2, 40, 28, PAL.red, 'center', FONT_T, 5);
    const left = e.spots.filter(f => f.burn > 0).length;
    plainText(g, `${e.time.toFixed(0)} s`, W / 2 - 350, 40, 16, INK, 'left');
    plainText(g, `plamenov: ${left}`, W / 2 + 350, 40, 16, left ? PAL.red2 : '#2d6a2d', 'right');
    plainText(g, 'TLAK VODE', W / 2 - 350, 72, 13, INK, 'left');
    inkPoly(g, [W / 2 - 270, 64, W / 2 - 120, 64, W / 2 - 120, 80, W / 2 - 270, 80], PAL.white, 2.5, 0.3, 1051);
    g.fillStyle = e.press > 0.3 ? '#7fc6e6' : '#e58a74'; g.fillRect(W / 2 - 268, 66, 146 * e.press, 12);
    let lx = legend(g, W / 2 - 100, 72, ['L↕'], 'P1: gor-dol = črpaj', 13);
    lx = legend(g, lx + 14, 72, ['L↔', 'L↕'], 'P2: meri', 13); legend(g, lx + 10, 72, ['A'], 'brizgaj', 13);
    plainText(g, e.press < 0.2 ? 'Ni tlaka – P1 naj hitro črpa!' : 'Pogasita vse plamene, preden se razširijo!', W / 2, 100, 15, e.press < 0.2 ? PAL.red2 : '#2d6a2d', 'center');
  }

  // ---------- pogled od zgoraj: hlod in kanjon ----------
  function ground(g, G, sx, sy) {
    const tr = G.track;
    const jp = G.jump && G.jump.pos;
    if (jp && Math.abs(jp - G.train.pos) < 400) {
      const P = (p, off) => { const q = trackPoint(tr, p, off); return [sx(q.x), sy(q.z)]; };
      const edge = (p, sgn) => { const a = []; for (let o = -120; o <= 120; o += 10) { const [x, y] = P(p + sgn * (2 + 2 * hsh(o * 0.37 + p)), o); a.push(x, y); } return a; };
      const e1 = edge(jp, 1), e2 = edge(jp + JUMP_GAP, -1);
      const poly = [...e1]; for (let i = e2.length - 2; i >= 0; i -= 2) poly.push(e2[i], e2[i + 1]);
      inkPoly(g, poly, '#6a4a34', 4, 1, 890);
      const inner = [...edge(jp + 7, 0)]; const e3 = edge(jp + JUMP_GAP - 7, 0); for (let i = e3.length - 2; i >= 0; i -= 2) inner.push(e3[i], e3[i + 1]);
      inkPoly(g, inner, '#3e2a1e', 2, 0.8, 891);
      const rv = []; for (let o = -120; o <= 120; o += 10) { const [x, y] = P(jp + JUMP_GAP / 2 + Math.sin(o * 0.08) * 3, o); rv.push(x, y); }
      g.beginPath(); for (let i = 0; i < rv.length; i += 2) i ? g.lineTo(rv[i], rv[i + 1]) : g.moveTo(rv[i], rv[i + 1]); stroke(g, 26, PAL.water);
      // klančini
      const ramp = (a, b, up) => {
        const n = 6;
        for (let k = 0; k < n; k++) {
          const p0 = lerp(a, b, k / n), p1 = lerp(a, b, (k + 1) / n), h = (up ? (k + 1) / n : 1 - k / n) * HR;
          const q = trackPoint(tr, (p0 + p1) / 2);
          box(g, sx(q.x), sy(q.z), q.ang, (p1 - p0) * PX + 1, 4 * PX, h * PX * ZK * 0.6, '#b8865a', PAL.wood, PAL.woodDark, 892 + k);
        }
      };
      ramp(jp - JUMP_RAMP, jp, true); ramp(jp + JUMP_GAP, jp + JUMP_GAP + JUMP_RAMP, false);
    }
  }
  function items(G, sx, sy, list) {
    const lg = G.log, tr = G.track;
    const bz = G.blaze;
    if (bz && bz.pos && Math.abs(bz.pos - G.train.pos) < 400) {
      const q = trackPoint(tr, bz.pos, 20), x = sx(q.x), y = sy(q.z), burning = bz.state !== 'done';
      list.push({ y, x, draw: g => {
        const img = spr('house1');
        if (img) g.drawImage(img, x - img.width * 0.7, y - img.height * 1.4 + 8, img.width * 1.4, img.height * 1.4);
        if (burning) {
          for (let k = -1; k <= 1; k++) { const fl = Math.sin(G.time * 12 + k * 2), fx = x + k * 26, b = y - 60, h = 40 + fl * 8;
            inkPoly(g, [fx - 16, b, fx - 6, b - h * 0.6, fx, b - h, fx + 8, b - h * 0.55, fx + 16, b], '#f0902a', 2.5, 0.6, 1060 + k); }
          const q2 = (G.time * 0.4) % 1; blobs(g, [[x - q2 * 40, y - 120 - q2 * 120, 18 + q2 * 26]], '#5a524a', 3, 1063);
          if (Math.abs(bz.pos - G.train.pos) < 200) World.bubble(g, x + 40, y - 150, 'Na pomoč!', 16);
        }
      } });
    }
    if (lg && Math.abs(lg.pos - G.train.pos) < 400) {
      const q = trackPoint(tr, lg.pos), x = sx(q.x), y = sy(q.z);
      list.push({ y: y + 4, x, draw: g => {
        const c = Math.cos(q.ang), s = Math.sin(q.ang);
        // hlod leži počez čez progo
        const nx = -s, ny = c, aside = lg.state === 'done';
        const o = aside ? 8 : 0, ax = x + c * o * PX, ay = y + s * o * PX;
        const p = (u, v) => [ax + nx * u * PX + c * v * PX, ay + ny * u * PX + s * v * PX];
        if (!aside) {
          blobs(g, [[...p(10, 0), 40], [...p(13, 2), 34], [...p(12, -3), 30]], PAL.leaf, 3, 895);
          const a = p(-7, 0), b = p(9, 0);
          inkLine(g, [a[0], a[1] - 4, b[0], b[1] - 4], 18, INK, 0.3); inkLine(g, [a[0], a[1] - 4, b[0], b[1] - 4], 12, PAL.wood, 0.3);
          inkEllipse(g, a[0], a[1] - 4, 9, 9, '#e8c890', 2.5, 896);
          inkEllipse(g, ...p(-8, 2), 8, 5, PAL.woodDark, 2, 897);
        } else {
          for (const [u, v] of [[6, 2], [8, -3]]) { const a = p(u, v), b = p(u + 7, v); inkLine(g, [a[0], a[1] - 4, b[0], b[1] - 4], 16, INK, 0.3); inkLine(g, [a[0], a[1] - 4, b[0], b[1] - 4], 10, PAL.wood, 0.3); }
          blobs(g, [[...p(16, 0), 30]], PAL.leaf, 3, 898);
        }
      } });
    }
  }

  function update(G, dt) {
    if (!G.ev) return;
    if (G.ev.kind === 'saw') updateSaw(G, dt);
    else if (G.ev.kind === 'jump') updateJump(G, dt);
    else if (G.ev.kind === 'chase') updateChase(G, dt);
    else if (G.ev.kind === 'blaze') updateBlaze(G, dt);
    else updateFire(G, dt);
  }
  function draw(g, G) {
    if (!G.ev) return;
    if (G.ev.kind === 'saw') drawSaw(g, G);
    else if (G.ev.kind === 'jump') drawJump(g, G);
    else if (G.ev.kind === 'chase') drawChaseScene(g, G);
    else if (G.ev.kind === 'blaze') drawBlaze(g, G);
    else drawFireScene(g, G);
  }
  return { modes, start, drive, alert, update, draw, drawLab, ground, items };
})();
