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

const Events = (() => {
  const modes = ['saw', 'jump', 'dragon'];
  const dirOf = p => (p.lx < -0.5 || p.left) ? -1 : (p.lx > 0.5 || p.right) ? 1 : 0;

  function start(G, kind) {
    G.mini = null;
    Snd.setWhistle(false); Snd.setSqueal(0); Snd.setSlip(0); Snd.setHiss(0);
    G.mode = kind;
    if (kind === 'saw') G.ev = { kind, t: 0, sp: 0, need: -1, prog: 0, jam: 0, jamCd: 0, done: 0, dust: [], sawT: 0, strokes: 0 };
    else if (kind === 'jump') startJump(G);
    else startDragon(G);
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
    if (G.dragon && G.dragon.state === 'idle' && G.dragon.pos && t.pos > G.dragon.pos - 40 && t.pos < G.dragon.pos + 300) {
      G.dragon.state = 'fight'; Snd.roar();
      G.msg('Zmaj se je razjezil in napada vlak!', '#f3c2b2', 3);
      transition(() => start(G, 'dragon')); return true;
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

  // ---------- 3) zmaj ----------
  const DR = { gy: 610, M: 13.5, front: 1190 };
  function startDragon(G) {
    const cars = trainCars(G.train), { M, front } = DR;
    const xs = cars.map(c => ({ ...c, x: front - c.off * M }));
    const wag = xs.filter(c => c.type === 'P' || c.type === 'F');
    const last = wag[wag.length - 1], labCar = wag[Math.min(2, wag.length - 1)];
    const roofY = DR.gy - 96 * M / SIDE_U;
    G.ev = { kind: 'dragon', t: 0, scroll: 0, cars: xs, roofY,
      minX: last.x - 6 * M + 18, maxX: wag[0].x + 6 * M - 18,
      weaponX: last.x - 30, labX: labCar.x, labCar: wag.indexOf(labCar),
      weapon: 'coal', loaded: false, loadT: 0, aim: 0.8, coalHits: 0, catHits: 0, hp: 3, lab: null,
      av: [{ x: wag[0].x - 40, f: -1, stun: 0, cd: 0, soot: 0, ph: 0, mv: false }, { x: last.x + 50, f: -1, stun: 0, cd: 0, soot: 0, ph: 0, mv: false }],
      d: { x: -200, y: 200, vx: 0, vy: 0, phi: -1.6, mode: 'enter', t: 0, attackT: 4, stun: 0, tx: 0, ty: 0, say: 'GRRRR! Moj vlak!', sayT: 2.5, f: 1, blend: 0 },
      shots: [], fire: [], fx: [], hint: 0, won: 0 };
  }
  function say(d, txt, t = 2) { d.say = txt; d.sayT = t; }
  function updateDragon(G, dt) {
    const e = G.ev, d = e.d;
    e.t += dt; e.scroll += 340 * dt;
    d.sayT = Math.max(0, d.sayT - dt);
    // zmaj
    d.t += dt;
    const ox = d.x, oy = d.y;
    if (e.won) {
      e.won += dt;
      d.x += 160 * dt; d.y -= 60 * dt + Math.sin(e.won * 6) * 2;
      if (e.won > 4.5 && !G.trans) transition(() => {
        G.mode = 'drive'; G.ev = null; G.dragon.state = 'done'; World.snap();
        G.msg('Zmaj je odletel domov. Vitez ploska!', PAL.yellow, 4); whistleTimer = 1;
      });
    } else if (d.stun > 0) {
      d.stun -= dt; d.y = Math.min(d.y + 60 * dt, 420);
    } else if (d.mode === 'enter') {
      d.x += 260 * dt; d.y = 200 + Math.sin(d.t * 2) * 30;
      if (d.x > 300) { d.mode = 'circle'; d.phi = Math.asin(clamp((d.x - 680) / 470, -1, 1)); }
    } else if (d.mode === 'circle') {
      d.phi += dt * 0.55;
      const cx = 680 + 470 * Math.sin(d.phi), cy = 200 + 90 * Math.sin(2 * d.phi);
      d.blend = Math.min(1, d.blend + dt);
      d.x = lerp(d.x, cx, d.blend < 1 ? dt * 3 : 1); d.y = lerp(d.y, cy, d.blend < 1 ? dt * 3 : 1);
      d.attackT -= dt;
      if (d.attackT <= 0) {
        const tg = e.av.filter(a => !a.stun);
        const a = tg.length ? tg[Math.floor(Math.random() * tg.length)] : e.av[0];
        d.mode = 'swoop'; d.t = 0; d.tgt = a;
        say(d, ['Ogenj za vse!', 'Hrrrr!', 'Pazi, vroče!', 'Pečen premog!'][Math.floor(Math.random() * 4)], 1.6);
      }
    } else if (d.mode === 'swoop') {
      const side = d.tgt.x > 640 ? -1 : 1;
      const tx = d.tgt.x + side * 150, ty = e.roofY - 190;
      d.x = lerp(d.x, tx, Math.min(1, dt * 2.5)); d.y = lerp(d.y, ty, Math.min(1, dt * 2.5));
      d.f = -side;
      if (d.t > 1.1) { d.mode = 'breathe'; d.t = 0; Snd.fire(); }
    } else if (d.mode === 'breathe') {
      const mx = d.x + d.f * 96 * 1.3, my = d.y - 40 * 1.3;
      if (Math.random() < dt * 40) {
        const tx = d.tgt.x + (Math.random() - 0.5) * 60, ty = e.roofY - 30;
        const T = 0.7, k = 1 / T;
        e.fire.push({ x: mx, y: my, vx: (tx - mx) * k, vy: (ty - my) * k, life: T + 0.3, r: 8 });
      }
      if (d.t > 1.4) { d.mode = 'circle'; d.blend = 0; d.attackT = 3.5 + Math.random() * 2.5; d.phi = Math.asin(clamp((d.x - 680) / 470, -1, 1)); }
    }
    d.vx = (d.x - ox) / Math.max(dt, 1e-4); d.vy = (d.y - oy) / Math.max(dt, 1e-4);
    if (d.mode !== 'swoop' && d.mode !== 'breathe' && Math.abs(d.vx) > 5) d.f = Math.sign(d.vx);
    // ogenj
    for (const f of e.fire) {
      f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; f.r += dt * 14;
      if (f.y > e.roofY - 40) { f.vy *= 0.3; f.vx *= 0.5; }
      for (const a of e.av) if (!a.stun && !e.won && Math.abs(f.x - a.x) < 26 && f.y > e.roofY - 80 && f.y < e.roofY) {
        a.stun = 1.6; a.soot = 6; G.addPoints(-2); Snd.bad();
        Ctl.rumble(e.av.indexOf(a), 0.7, 0.7, 250);
        G.msg(`${e.av.indexOf(a) ? 'Kurjača' : 'Strojevodjo'} je opeklo! −2`, '#f3c2b2', 1.5);
      }
    }
    e.fire = e.fire.filter(f => f.life > 0);
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
        e.aim = clamp(e.aim + ay * dt * 0.9, 0.15, 1.35);
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
      if (!s.hit && !e.won && Math.hypot((s.x - d.x) / 1.3, s.y - (d.y - 10)) < (s.kind === 'coal' ? 52 : 62)) { s.hit = true; hit(G, s); }
    }
    e.shots = e.shots.filter(s => !s.hit && s.y < H + 50 && s.x > -100 && s.x < W + 100);
    for (const f of e.fx) f.t += dt;
    e.fx = e.fx.filter(f => f.t < 1);
    e.hint += dt;
  }
  // smer metanja: proti zmaju
  const sideOf = (e, x) => Math.sign(e.d.x - x) || 1;
  function throwCoal(G, a) {
    const e = G.ev, d = e.d;
    const x = a.x, y = e.roofY - 60, T = clamp(Math.hypot(d.x - x, d.y - y) / 650, 0.45, 1.1), g = 900;
    const tx = d.x + d.vx * T * 0.8 + (Math.random() - 0.5) * 70, ty = d.y + d.vy * T * 0.8 + (Math.random() - 0.5) * 60;
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
      say(d, ['Hihi, žgečka!', 'To je vse?', 'Mmm, premog!', 'Haha!'][e.coalHits % 4], 1.4);
    } else if (s.kind === 'catapult') {
      e.catHits++; d.stun = 1.6; Snd.clank(); G.addPoints(5);
      say(d, e.catHits >= 2 ? 'Grrr! To me ne ustavi!' : 'AUU! Moja glava!', 2);
      if (e.catHits === 2) G.msg('Katapult ni dovolj! V laboratoriju razvijajo balisto.', PAL.yellow, 4);
    } else {
      e.hp--; d.stun = 2; Snd.clank(); G.addPoints(10);
      if (e.hp <= 0) {
        e.won = 0.01; d.stun = 0; G.addPoints(50); G.score.dragon = true;
        say(d, 'Oprostite! Ne bom več! Bu-hu!', 4.5);
        G.msg('ZMAJ JE PREMAGAN! +50', '#d9ecc4', 4); Snd.good(); Snd.roar();
      } else say(d, e.hp === 2 ? 'Kaj je to?! Mreža!' : 'Ne! Še ena mreža!', 2);
    }
  }
  function enterLab(G) {
    const e = G.ev;
    if (e.weapon === 'ballista') { G.msg('Balista je že na zadnjem vagonu!', PAL.yellow, 2); return; }
    if (e.weapon === 'catapult' && e.catHits < 2) { G.msg('Najprej preizkusita katapult na zmaju!', PAL.yellow, 2.5); return; }
    e.lab = e.weapon === 'coal' ? 'catapult' : 'ballista';
    Snd.click();
    Quiz.open(G, 'lab', { max: 3, onEnd: () => {
      e.weapon = e.lab; e.loaded = false; e.aim = 0.8;
      for (const a of e.av) a.x = e.weaponX + (a === e.av[0] ? 70 : 20);
      G.msg(e.lab === 'catapult' ? 'Katapult je na zadnjem vagonu! A naloži in izstreli, palica gor/dol meri' : 'Balista je pripravljena! Naloži in meri v zmaja!', '#d9ecc4', 5);
      e.lab = null; Snd.good();
    } });
  }

  function drawDragonScene(g, G) {
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
    // zmaj
    drawDragonFly(g, d.x, d.y, G.time, d.f, 1.3, { breath: d.mode === 'breathe', stun: d.stun > 0 || e.won, net: 3 - e.hp, angry: d.mode === 'swoop' });
    for (const f of e.fire) fireBlob(g, f.x, f.y, f.r, Math.floor(f.x));
    for (const f of e.fx) burstText(g, f.x, f.y - 40, f.text, 0.6 + f.t * 0.3, PAL.yellow, 810);
    if (d.sayT > 0) World.bubble(g, d.x + d.f * 60, d.y - 130, d.say, 18);
    // HUD
    card(g, W / 2 - 360, 12, 720, 104, PAL.cream, 820, 14);
    toonText(g, e.won ? 'ZMAJ JE PREMAGAN!' : 'ZMAJ NAPADA!', W / 2, 40, 28, PAL.red, 'center', FONT_T, 5);
    const name = { coal: 'premog', catapult: 'katapult', ballista: 'balista' }[e.weapon];
    plainText(g, `Orožje: ${name}`, W / 2 - 330, 72, 16, INK, 'left');
    for (let k = 0; k < 3; k++) inkPoly(g, HUD.star(W / 2 + 230 + k * 36, 40, 15, 7), k < 3 - e.hp ? '#e6d6a0' : PAL.cream, 2.5, 0.4, 830 + k);
    plainText(g, 'mreže', W / 2 + 266, 70, 12, INK, 'center');
    let tip;
    if (e.weapon === 'coal') tip = e.coalHits >= 2 || e.hint > 12 ? 'Premog ga ne ustavi! Pojdita v LABORATORIJ  (Y pri loputi)' : 'Mečita premog v zmaja';
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
    // okno z zmajem
    inkEllipse(g, 120, 130, 80, 80, '#e7b892', 6, 870);
    g.save(); g.beginPath(); g.arc(120, 130, 76, 0, 7); g.clip();
    blobs(g, [[80, 190, 40], [160, 200, 50]], '#879a58', 2, 871);
    drawDragonFly(g, 120 + Math.sin(G.time * 1.3) * 60, 130 + Math.sin(G.time * 2.6) * 20, G.time, Math.cos(G.time * 1.3) > 0 ? 1 : -1, 0.45, {});
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
    else updateDragon(G, dt);
  }
  function draw(g, G) {
    if (!G.ev) return;
    if (G.ev.kind === 'saw') drawSaw(g, G);
    else if (G.ev.kind === 'jump') drawJump(g, G);
    else drawDragonScene(g, G);
  }
  return { modes, start, drive, alert, update, draw, drawLab, ground, items };
})();
