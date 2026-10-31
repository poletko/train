'use strict';
// Glavna zanka, stanja igre in prehodi.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px';
}
addEventListener('resize', fit); fit();
addEventListener('keydown', e => {
  Snd.init();
  const dg = e.code.match(/^(?:Digit|Numpad)(\d)$/);
  if (dg && G && G.quiz) { Quiz.typeDigit(G, +dg[1]); return; }
  if (e.code === 'KeyM') Snd.mute(); if (e.code === 'F11') { e.preventDefault(); document.documentElement.requestFullscreen?.(); } });
addEventListener('pointerdown', () => Snd.init());

let G = null;
let whistleTimer = 0;
const FIXED = 1 / 120;
let acc = 0;

function newGame() {
  const track = buildTrack();
  const train = makeTrain();
  train.pos = track.stops[0] * SEG;
  const sched = { arr: [START_TIME], dep: [START_TIME + FIRST_DWELL] };
  for (let k = 1; k < STATIONS.length; k++) {
    sched.arr[k] = sched.dep[k - 1] + track.legs[k - 1].sched;
    sched.dep[k] = sched.arr[k] + DWELL;
  }
  G = {
    mode: 'title', track, train, sched, clock: START_TIME, leg: 0, st: null,
    log: { pos: track.logPos, state: 'idle' }, jump: { pos: track.jumpPos, state: 'idle', tries: 0 }, chase: { pos: track.chasePos, state: 'idle' }, dragon: { pos: track.firePos, tunnel: track.fireTunnel, state: 'idle' }, blaze: { pos: track.blazePos, state: 'idle' }, ev: null,
    challenges: makeChallenges(track), kids: makeKids(track), depot: null, depotCool: 0, quiz: null, mini: null, miniT: 60, crash: null, pic: null,
    score: { points: 0, delivered: 0, missed: 0, left: 0, violations: 0, penalties: 0, late: 0, onTime: 0, sheep: 0, kids: 0, mini: 0, saw: 0, jump: '', chase: false, fire: 0, blaze: 0 },
    msgs: [], violated: new Set(), ready: [false, false], reason: '', time: 0, paused: false, trans: null,
    msg(text, color = PAL.cream, dur = 3) { this.msgs.unshift({ text, color, t: dur, dur }); if (this.msgs.length > 3) this.msgs.pop(); },
    addPoints(p) { this.score.points += p; },
    depart(k, res) {
      if (this.st.last) { transition(() => { this.mode = 'end'; Snd.ding(); }); return; }
      transition(() => {
        this.leg = k; this.mode = 'drive'; this.st = null; this.mini = null;
        this.train.brake = 1;
        this.train.used = { coal: 0, water: 0, sand: 0 };
        World.snap();
        if (res.missed || res.left) this.msg(`Pozabljeno: ${res.missed} v vlaku, ${res.left} na peronu`, '#f3c2b2', 4);
        this.msg('Odpravnik žvižga – odhod!', PAL.yellow, 3);
        whistleTimer = 1.2;
      });
    },
  };
  World.snap();
}

// ovce na progi (travniki in vinogradi)
function makeChallenges(track) {
  const out = [];
  for (const L of [0, 1, 4]) {
    // na odseku s skakalnico ovce stojijo dovolj zgodaj, da je še prostor za zalet
    let i = Math.round(lerp(track.stops[L], track.stops[L + 1], L === 1 ? 0.12 + Math.random() * 0.2 : 0.35 + Math.random() * 0.3)), n = 0;
    while (!track.freeAt(i, 30) && n++ < 40) i += 7;
    const flock = [];
    for (let k = 0; k < 5; k++) flock.push({ off: -2.6 + k * 1.3 + (Math.random() - 0.5) * 0.6, dz: (Math.random() - 0.5) * 8, ph: Math.random() * 6, dir: k < 2 || (k === 2 && Math.random() < 0.5) ? -1 : 1, hop: 0 });
    out.push({ type: 'sheep', pos: i * SEG, state: 'idle', t: 0, hit: false, flock });
  }
  return out;
}

// otroci ob progi (ob vaseh): če jim zatrobiš, so dodatne točke
function makeKids(track) {
  const out = [], shirts = [PAL.mustard, PAL.blue, '#b06ea8', PAL.leaf, '#d98a4a', PAL.red];
  for (const ci of track.crossings) {
    const i = ci + (Math.random() < 0.5 ? -1 : 1) * (14 + Math.floor(Math.random() * 10));
    const side = Math.random() < 0.5 ? -1 : 1;
    out.push({ pos: i * SEG, off: side * 8, happy: 0, list: [0, 1, 2].map(k => ({ dz: (k - 1) * 2.5, doff: side * (k % 2) * 1.5, face: -side || 1, seed: Math.random() * 100,
      shirt: shirts[(ci + k) % shirts.length], hat: ['flower', 'cap', null][k], hatCol: shirts[(ci + k + 2) % shirts.length] })) });
  }
  return out;
}

function transition(mid) {
  if (G.trans) return;
  G.trans = { t: 0, mid, done: false };
}

function arrive(k) {
  const late = G.clock - G.sched.arr[k];
  if (late <= 30) { G.addPoints(50); G.score.onTime++; G.msg('Točno na minuto! +50', '#d9ecc4'); }
  else { const p = Math.round(late / 10); G.addPoints(-p); G.score.late += late; G.msg(`Zamuda ${fmtDelta(late).slice(1)}  −${p}`, '#f3c2b2'); }
  Snd.ding();
  transition(() => { G.mode = 'station'; Station.enter(G, k); });
}

function gameOver(reason, pic = 'derail') {
  G.mode = 'over'; G.reason = reason; G.pic = pic; G.overT = 0;
  Snd.boom(); Snd.setHiss(0); Snd.setWhistle(false); Snd.setSqueal(0); Snd.setSlip(0);
  Ctl.rumble(0, 1, 1, 900); Ctl.rumble(1, 1, 1, 900);
}

// zaloge pošle: kazen je račun, po pravilnem odgovoru dobita zasilno rezervo
function penalty(what) {
  if (G.quiz) return;
  const t = G.train;
  G.score.penalties++; G.addPoints(-20);
  t.reg = 0;
  Snd.bad(); Ctl.rumble(0, 0.6, 0.4, 300); Ctl.rumble(1, 0.6, 0.4, 300);
  Quiz.open(G, 'penalty', { what, onEnd: () => {
    t[what] += RESERVE[what];
    if (what === 'coal') t.grate = Math.max(t.grate, 60);
    G.msg(`Zasilna rezerva: +${what === 'water' ? RESERVE.water + ' m³ vode' : RESERVE[what] + ' kg ' + (what === 'coal' ? 'premoga' : 'peska')}`, '#d9ecc4', 4);
  } });
}
// nesreča: kratka animacija, nato kartica s sliko
function crash(kind, reason) {
  World.startCrash(G, kind);
  G.mode = 'crash'; G.crashReason = reason;
  Snd.clank(); Snd.boom(); Snd.setWhistle(false); Snd.setHiss(0); Snd.setSlip(0); Snd.setSqueal(0);
  if (kind === 'bridge' && Snd.splash) setTimeout(() => Snd.splash(), 500);
  Ctl.rumble(0, 1, 1, 1200); Ctl.rumble(1, 1, 1, 1200);
}

function updateDrive(dt) {
  const t = G.train, p1 = Ctl.p[0], p2 = Ctl.p[1];
  // P1 – strojevodja
  const regIn = clamp(p1.ly + (p1.up ? 1 : 0) - (p1.down ? 1 : 0), -1, 1);
  t.reg = clamp(t.reg + regIn * 0.45 * dt, 0, 1);
  if (p1.lt > 0.02 || p1.lb) t.brake = Math.max(p1.lt, p1.lb ? 1 : 0);
  else t.brake = Math.max(0, t.brake - dt * 2.5);
  if (G.dbgStill) { t.brake = 1; t.reg = 0; }
  t.sanding = p1.a;
  t.whistle = p1.b || whistleTimer > 0;
  if (Ctl.pressed(0, 'y')) {
    if (Math.abs(t.v) < 0.1) { t.dir *= -1; G.msg(t.dir > 0 ? 'Smer: NAPREJ' : 'Smer: NAZAJ', PAL.yellow); Snd.clank(); }
    else G.msg('Smer obrneš, ko vlak stoji.', '#f3c2b2');
  }
  whistleTimer = Math.max(0, whistleTimer - dt);
  Snd.setWhistle(t.whistle);
  // P2 – kurjač
  t.inj = p2.rt;
  if (G.mini) Quiz.updateMini(G, dt);
  else {
    if (Ctl.pressed(1, 'a') || Ctl.pressed(1, 'x')) {
      if (shovel(t)) { Snd.shovel(); Ctl.rumble(1, 0.2, 0.4, 80); }
      else if (t.coal <= 0) G.msg('Tender je prazen!', '#f3c2b2', 1);
    }
    const dmp = clamp(p2.lx + (p2.right ? 1 : 0) - (p2.left ? 1 : 0), -1, 1);
    t.damper = clamp(t.damper + dmp * 0.5 * dt, 0.2, 1.5);
    // kurjačev račun tu in tam med vožnjo
    G.miniT -= dt;
    const toStop = G.track.stops[G.leg + 1] * SEG - t.pos;
    if (G.miniT <= 0 && toStop > 350 && Math.abs(t.v) > 2) {
      Quiz.openMini(G); G.score.mini++;
      G.miniT = MINI_QUIZ_EVERY[0] + Math.random() * (MINI_QUIZ_EVERY[1] - MINI_QUIZ_EVERY[0]);
    }
  }

  acc += dt;
  const ev = new Set();
  while (acc >= FIXED) {
    for (const e of simStep(t, G.track, FIXED)) ev.add(e);
    acc -= FIXED;
    if (ev.has('explode')) break;
  }
  if (ev.has('explode')) { gameOver('BUM! Kotel je eksplodiral – zmanjkalo je vode!', 'boom'); return; }
  if (ev.has('chuff')) { Snd.chuff(t.reg * (t.P / 16)); World.emit(G, 'chuff'); }
  if (ev.has('clack')) Snd.clack(Math.min(1, Math.abs(t.v) / 15));
  if (ev.has('slip')) Ctl.rumble(0, 0.6, 0.6, 300);
  if (t.slipping) Ctl.rumble(0, 0.3, 0.3, 50);
  for (const r of ['coal', 'water', 'sand']) if (ev.has('out:' + r)) { penalty(r); break; }
  if (G.mode !== 'drive' || G.quiz) return;

  // ovce: piščalka jih prežene, sicer zaustavijo vlak
  for (const c of G.challenges) {
    if (c.state !== 'idle') continue;
    const d = c.pos - t.pos;
    if (t.whistle && d < 260 && d > -8) {
      c.state = 'flee'; c.t = 0; G.score.sheep++; G.addPoints(10);
      G.msg('Beee! Ovce so zbežale. +10', '#d9ecc4'); Snd.bleat && Snd.bleat();
    } else if (d < 14 && d > -8 && t.v > 0.05) {
      t.v = 0; t.pos = c.pos - 14; t.reg = 0;
      if (!c.hit) { c.hit = true; G.addPoints(-15); G.msg('Ovce so ustavile vlak! −15', '#f3c2b2', 4); }
      G.msg('Zatrobi s piščalko (B)!', PAL.yellow, 3);
      Snd.bad(); Snd.bleat && Snd.bleat(); Ctl.rumble(0, 0.8, 0.8, 300);
    }
  }
  // otroci ob progi
  for (const c of G.kids) {
    if (c.happy) continue;
    const d = c.pos - t.pos;
    if (t.whistle && d < 120 && d > -60) { c.happy = 0.01; G.score.kids++; G.addPoints(KID_BONUS); G.msg(`Otroci so veseli! +${KID_BONUS}`, '#d9ecc4'); }
  }
  if (Events.drive(G)) return;
  // skladišče premoga, ko ga zmanjkuje
  const stopZ = G.track.stops[G.leg + 1] * SEG;
  if (!G.depot && t.coal < COAL_LOW && t.pos > G.depotCool) {
    let p = t.pos + 450;
    while (segAt(G.track, p).tunnel || segAt(G.track, p).bridge || segAt(G.track, p + 30).bridge || segAt(G.track, p).jump) p += 30;
    if (stopZ - p > 400) { G.depot = { pos: p, used: false }; G.msg('Premoga zmanjkuje! Ob progi je skladišče – ustavi pri H.', PAL.yellow, 5); }
  }
  if (G.depot) {
    const d = G.depot.pos - t.pos;
    if (!G.depot.used && Math.abs(t.v) < 0.05 && Math.abs(d) < 25 && t.reg < 0.05) {
      const max = Math.min(4, Math.floor((TRAIN.coalCap - t.coal) / 500));
      G.depot.used = true;
      if (max > 0) Quiz.open(G, 'buy', { max, onEnd: q => G.msg(`Kupljeno: ${q.done} ${q.done === 1 ? 'voz' : q.done === 2 ? 'voza' : q.done < 5 ? 'vozovi' : 'vozov'} premoga`, '#d9ecc4', 4) });
      return;
    }
    if (d < -150) { if (!G.depot.used) G.depotCool = t.pos + 400; G.depot = null; }
  }

  Snd.setHiss(clamp(t.valve / 2, 0, 1) + (t.injActive ? 0.25 : 0));
  Snd.setSlip(t.slipping ? 1 : 0);
  Snd.setSqueal(t.brake > 0.3 && Math.abs(t.v) > 1 && Math.abs(t.v) < 12 ? t.brake : 0);
  const seg = segAt(G.track, t.pos);
  Snd.setRain(seg.rain && !seg.tunnel ? 1 : 0);

  const kmh = Math.abs(t.v) * 3.6;
  if (kmh > seg.limit + 5 && !G.violated.has(seg.zone)) {
    G.violated.add(seg.zone); G.score.violations++; G.addPoints(-10);
    G.msg(`Prehitro! Omejitev ${seg.limit} km/h  −10`, '#f3c2b2');
    Snd.bad();
  }
  if (seg.R && Math.abs(t.v) > Math.sqrt(2.0 * seg.R)) { crash('derail', `Vlak je iztiril v ovinku pri ${kmh.toFixed(0)} km/h!`); return; }
  if (seg.bridge) {
    if (kmh > seg.limit + BRIDGE_BREAK) { crash('bridge', `Most se je podrl pri ${kmh.toFixed(0)} km/h (dovoljeno ${seg.limit})!`); return; }
    if (kmh > seg.limit + 5 && Math.random() < dt * 2) G.msg('Most škriplje! Upočasni!', '#f3c2b2', 1.5);
  }

  const next = G.leg + 1;
  const d = G.track.stops[next] * SEG - t.pos;
  if (Math.abs(t.v) < 0.05 && Math.abs(d) < 25 && t.reg < 0.05 && !G.trans) arrive(next);
}

// ---------------- kartice ----------------
function sunburst(g, col1, col2) {
  g.fillStyle = col1; g.fillRect(0, 0, W, H);
  g.fillStyle = col2;
  const n = 24, rot = G.time * 0.1;
  for (let k = 0; k < n; k += 2) {
    g.beginPath(); g.moveTo(W / 2, H / 2);
    g.arc(W / 2, H / 2, 1400, rot + k / n * Math.PI * 2, rot + (k + 1) / n * Math.PI * 2); g.closePath(); g.fill();
  }
}
function ornateFrame(g, x, y, w, h, fill) {
  card(g, x, y, w, h, fill, 300, 24);
  g.save(); g.setLineDash([2, 8]); g.beginPath(); g.rect(x + 14, y + 14, w - 28, h - 28); stroke(g, 3); g.restore();
  for (const [cx, cy] of [[x + 14, y + 14], [x + w - 14, y + 14], [x + 14, y + h - 14], [x + w - 14, y + h - 14]]) inkEllipse(g, cx, cy, 10, 10, PAL.red, 3, cx);
}
function drawTitle(g) {
  sunburst(g, '#f1d79a', '#e7c278');
  // lokomotiva z dimom
  const bx = W / 2 + Math.sin(G.time * 0.6) * 40;
  drawCar(g, 'loco', bx, 430, 0, 13, { dist: G.time * 6, mood: 'happy', blink: hsh(Math.floor(BEAT * 2)) < 0.07 });
  for (let k = 0; k < 4; k++) {
    const t = (G.time * 0.5 + k / 4) % 1;
    const x = bx + 5 * 13 - t * 60, y = 340 - t * 160, r = 12 + t * 26;
    blobs(g, [[x, y, r], [x - r * 0.6, y + r * 0.3, r * 0.7], [x + r * 0.6, y + r * 0.2, r * 0.6]], PAL.cloud, 3, k);
  }
  ornateFrame(g, 190, 30, 900, 200, PAL.cream);
  g.save(); g.translate(W / 2, 112); g.rotate(Math.sin(BEAT * Math.PI) * 0.015);
  toonText(g, 'PARNA PROGA', 0, 0, 92, PAL.red, 'center', FONT_T, 12);
  g.restore();
  toonText(g, 'Jesenice → Nova Gorica · risanka za dva strojnika', W / 2, 190, 22, PAL.cream, 'center', FONT);
  const who = [[200, 'STROJEVODJA', { shirt: PAL.red, pants: PAL.navy, hat: 'cap', hatCol: PAL.blue, seed: 3 }, 'vozi vlak in nalaga potnike', 'E'],
    [W - 200, 'KURJAČ', { shirt: PAL.teal, pants: '#6b4a2f', hat: 'bandana', hatCol: PAL.red, seed: 9, soot: true, face: -1 }, 'kuri kotel in vozi viličar', 'Enter']];
  who.forEach(([x, name, o, job, key], i) => {
    const ready = G.ready[i];
    drawToon(g, x, 520, { ...o, sc: 2, wave: ready, mood: ready ? 'happy' : 'oh' });
    card(g, x - 150, 556, 300, 140, ready ? '#d9ecc4' : PAL.cream, 310 + i, 14);
    toonText(g, name, x, 582, 22, i ? PAL.teal : PAL.red, 'center', FONT_T);
    plainText(g, job, x, 610, 15, INK, 'center', FONT, 'normal');
    const pad = Ctl.padName(i);
    plainText(g, ready ? '✔ PRIPRAVLJEN!' : pad ? 'pritisni A' : `pritisni A na kontrolerju (${key})`, x, 640, 16, ready ? '#2d6a2d' : PAL.red2, 'center');
    plainText(g, pad ? '🎮 ' + pad.slice(0, 26) : `vidnih kontrolerjev: ${Ctl.padCount()}`, x, 668, 12, INK, 'center', FONT, 'normal');
  });
  card(g, W / 2 - 270, 584, 540, 112, PAL.cream, 320, 12);
  plainText(g, 'VOŽNJA', W / 2, 600, 13, PAL.red2, 'center');
  let lx = legend(g, W / 2 - 256, 624, ['L↕'], 'para', 13); lx = legend(g, lx + 6, 624, ['LT'], 'zavora', 13);
  lx = legend(g, lx + 6, 624, ['A'], 'pesek', 13); legend(g, lx + 6, 624, ['B'], 'piščalka (ovce!)', 13);
  lx = legend(g, W / 2 - 256, 652, ['A'], 'lopata', 13); lx = legend(g, lx + 6, 652, ['RT'], 'voda v kotel', 13); legend(g, lx + 6, 652, ['L↔'], 'loputa', 13);
  plainText(g, 'zgoraj strojevodja · spodaj kurjač · M zvok · F11 cel zaslon · Start premor', W / 2, 680, 11, '#6b5a40', 'center', FONT, 'normal');
}
function drawStats(g, y) {
  const s = G.score;
  const lines = [
    `Dostavljeno: ${s.delivered}   ·   pozabljeno: ${s.missed + s.left}`,
    `Točni prihodi: ${s.onTime}   ·   zamuda skupaj: ${fmtDelta(s.late).slice(1)}`,
    `Prehitro: ${s.violations}×   ·   ovce: ${s.sheep}   ·   veseli otroci: ${s.kids}   ·   kazni: ${s.penalties}`,
    `Hlod: ${s.saw ? s.saw.toFixed(1) + ' s' : '–'}   ·   skok: ${s.jump || (G.jump.tries ? 'v kanjonu' : '–')}${G.jump.tries ? ` (padci: ${G.jump.tries})` : ''}   ·   razbojnik: ${s.chase ? 'ujet' : '–'}   ·   krogle: ${s.fire}   ·   požar: ${s.blaze ? s.blaze.toFixed(0) + ' s' : '–'}`,
  ];
  lines.forEach((l, i) => plainText(g, l, W / 2, y + i * 32, 21, INK, 'center'));
}
function drawOver(g) {
  sunburst(g, '#e2a28a', '#cf8a72');
  ornateFrame(g, 200, 20, 880, 680, PAL.cream);
  toonText(g, 'JOJ!', W / 2, 82, 72, PAL.red, 'center', FONT_T, 11);
  crashPicture(g, W / 2, 268, 520, 250, G.pic || 'derail', G.time);
  plainText(g, G.reason, W / 2, 428, 24, INK, 'center');
  drawStats(g, 474);
  inkPoly(g, HUD.star(W / 2 - 230, 600, 40, 18), PAL.yellow, 3.5, 0.8, 5);
  toonText(g, String(G.score.points), W / 2 - 230, 602, 20, PAL.white);
  if (Math.floor(G.time * 2) % 2) { const x = legend(g, W / 2 - 110, 640, ['A'], 'poskusi znova', 24); void x; }
}
function drawEnd(g) {
  sunburst(g, '#f1d79a', '#e7c278');
  ornateFrame(g, 200, 50, 880, 560, PAL.cream);
  toonText(g, 'KONEC', W / 2, 140, 100, PAL.red, 'center', FONT_T, 13);
  plainText(g, 'Prispeli ste v Novo Gorico! To je vse, prijatelji!', W / 2, 220, 24, INK, 'center');
  drawStats(g, 280);
  const p = G.score.points;
  const rank = p >= 1300 ? 'mojstri parne vleke' : p >= 900 ? 'izkušena posadka' : p >= 450 ? 'solidna posadka' : 'vajenci';
  inkPoly(g, HUD.star(W / 2, 440, 54, 24), PAL.yellow, 4, 0.8, 5);
  toonText(g, String(p), W / 2, 442, 26, PAL.white);
  toonText(g, 'Naziv: ' + rank, W / 2, 520, 30, PAL.mustard, 'center', FONT_T);
  drawToon(g, 290, 590, { shirt: PAL.red, pants: PAL.navy, hat: 'cap', hatCol: PAL.blue, sc: 1.6, wave: true, seed: 3 });
  drawToon(g, W - 290, 590, { shirt: PAL.teal, pants: '#6b4a2f', hat: 'bandana', hatCol: PAL.red, sc: 1.6, wave: true, face: -1, seed: 9, soot: true });
  if (Math.floor(G.time * 2) % 2) legend(g, W / 2 - 90, 580, ['A'], 'nova vožnja', 24);
}

// ---------------- zanka ----------------
function tick(dt) {
  Ctl.update(dt);
  if (window.AUTO) window.AUTO.control(G, dt);
  G.time += dt;
  if (Ctl.p[0].a || Ctl.p[1].a) Snd.init();
  if ((Ctl.pressed(0, 'start') || Ctl.pressed(1, 'start')) && (G.mode === 'drive' || G.mode === 'station' || Events.modes.includes(G.mode))) G.paused = !G.paused;
  if (G.paused) return;
  if (G.trans) {
    G.trans.t += dt;
    if (G.trans.t >= 0.6 && !G.trans.done) { G.trans.done = true; G.trans.mid(); }
    if (G.trans.t >= 1.2) G.trans = null;
  }
  const busy = G.trans && !G.trans.done;
  if (G.quiz) {
    Quiz.update(G, dt);
    if (G.quiz && (G.quiz.purpose === 'buy' || G.quiz.purpose === 'lab')) G.clock += dt;   // nakup in laboratorij vzameta čas, kazen ne
    Snd.setWhistle(false); Snd.setSqueal(0); Snd.setSlip(0);
  } else if (G.mode === 'crash') {
    if (G.crash.t > 3.6) gameOver(G.crashReason, G.crash.kind);
  } else if (G.mode === 'title') {
    for (const i of [0, 1]) if (Ctl.pressed(i, 'a')) { G.ready[i] = !G.ready[i]; Snd.click(); }
    if (G.ready[0] && G.ready[1] && !G.trans) transition(() => { G.mode = 'station'; Station.enter(G, 0); Snd.ding(); });
  } else if (G.mode === 'drive') {
    G.clock += dt;
    if (!busy) updateDrive(dt);
  } else if (Events.modes.includes(G.mode)) {
    G.clock += dt;
    Snd.setHiss(0); Snd.setSlip(0); Snd.setSqueal(0); Snd.setRain(0);
    Snd.setWhistle(whistleTimer > 0); whistleTimer = Math.max(0, whistleTimer - dt);
    if (!busy) Events.update(G, dt);
  } else if (G.mode === 'station') {
    G.clock += dt;
    Snd.setHiss(0); Snd.setSlip(0); Snd.setSqueal(0); Snd.setWhistle(false); Snd.setRain(0);
    simStep(G.train, G.track, dt);   // kotel med postankom živi naprej
    if (!busy) Station.update(G, dt);
  } else if (G.mode === 'over' || G.mode === 'end') {
    if (Ctl.pressed(0, 'a') || Ctl.pressed(1, 'a')) newGame();
  }
  for (const m of G.msgs) m.t -= dt;
  G.msgs = G.msgs.filter(m => m.t > 0);
  World.update(G, dt);
}

function draw() {
  BOIL = Math.floor(G.time * 12);
  BOILS = Math.floor(G.time * 8);
  BEAT = G.time * BPM / 60;
  FX.weave(ctx);
  if (G.mode === 'title') drawTitle(ctx);
  else if (G.mode === 'drive') {
    World.draw(ctx, G);
    HUD.drawTop(ctx, G); HUD.drawP1(ctx, G); HUD.drawP2(ctx, G); HUD.messages(ctx, G, 210);
    if (G.mini && !G.quiz) Quiz.drawMini(ctx, G);
    if (G.quiz) Quiz.draw(ctx, G);
  } else if (Events.modes.includes(G.mode)) {
    Events.draw(ctx, G);
    if (G.quiz) { if (G.quiz.purpose === 'lab') Events.drawLab(ctx, G); else Quiz.draw(ctx, G); }
    HUD.messages(ctx, G, G.quiz ? 60 : 160);
  } else if (G.mode === 'crash') World.draw(ctx, G); else if (G.mode === 'station') { Station.draw(ctx, G); HUD.messages(ctx, G, 90); }
  else if (G.mode === 'over') drawOver(ctx);
  else if (G.mode === 'end') drawEnd(ctx);
  if (G.paused) {
    ctx.fillStyle = 'rgba(29,22,17,0.55)'; ctx.fillRect(0, 0, W, H);
    ornateFrame(ctx, W / 2 - 220, H / 2 - 90, 440, 180, PAL.cream);
    toonText(ctx, 'PREMOR', W / 2, H / 2 - 20, 56, PAL.red, 'center', FONT_T, 8);
    plainText(ctx, 'Start / Esc za nadaljevanje', W / 2, H / 2 + 45, 18, INK, 'center');
  }
  FX.post(ctx);
  if (G.trans) { const t = G.trans.t; FX.iris(ctx, t < 0.6 ? 1 - t / 0.6 : (t - 0.6) / 0.6); }
}

let last = performance.now();
let lastError = null;
function frame(now) {
  const dt = window.AUTO ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
  last = now;
  // avtopilot teče s časovnikom (brezglavi Chrome sličice redko izriše)
  requestAnimationFrame(frame);
  // napaka ne sme ustaviti igre: zapiši jo na zaslon in nadaljuj
  try {
    const n = window.AUTO ? (window.AUTO.stopAt && G.time >= window.AUTO.stopAt ? 0 : window.AUTO.speed) : 1;
    for (let i = 0; i < n; i++) tick(dt);
    const t = G.train;
    Snd.music(G.mode === 'drive' ? clamp(Math.abs(t.v) / 18, 0.15, 1) : G.mode === 'station' ? 0.5 : Events.modes.includes(G.mode) ? 1 : 0.7);
    draw();
  } catch (e) {
    console.error(e);
    lastError = { msg: String(e && e.message || e), where: String(e && e.stack || '').split('\n')[1] || '', mode: G.mode, t: 8 };
  }
  if (lastError && lastError.t > 0) {
    lastError.t -= dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(120,20,10,0.9)'; ctx.fillRect(0, H - 60, W, 60);
    ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`NAPAKA (${lastError.mode}): ${lastError.msg}`, 12, H - 40);
    ctx.fillText(lastError.where.trim().slice(0, 150), 12, H - 18);
  }
}

function start() {
  FX.init(); bakeAll(); World.init();
  newGame();
  // razvojne bližnjice: index.html#drive, #drive@<metri>, #station
  const dbg = location.hash.match(/^#(drive|station)(?:@(\d+))?(?:v(\d+))?(?:c(\d+))?/);
  if (dbg) {
    const t = G.train; t.coal = 3000; t.water = 15; t.sand = 200;
    t.wagons[0].slots[0] = { kind: 'P', dest: 1 }; t.wagons[2].slots[1] = { kind: 'F', dest: 2 }; t.wagons[3].slots[0] = { kind: 'F', dest: 0 };
    if (dbg[1] === 'drive') {
      G.mode = 'drive'; t.pos = dbg[2] ? +dbg[2] : t.pos + 600; t.v = dbg[3] ? +dbg[3] : 12; t.reg = 0.5;
      if (dbg[4]) t.coal = +dbg[4];
      if (location.hash.includes('sheep')) { G.challenges[0].pos = t.pos + 160; }
      if (location.hash.includes('still')) { t.v = 0; t.reg = 0; t.brake = 1; G.dbgStill = true; }
      if (location.hash.includes('quiz')) { t.v = 0; Quiz.open(G, 'buy', { max: 3 }); }
      G.leg = Math.max(0, G.track.stops.findIndex(s => s * SEG > t.pos) - 1);
    } else { G.mode = 'station'; Station.enter(G, 0); }
  }
  // vmesne igre: #ev-saw, #ev-jump (#ev-jump-slow), #ev-chase (#ev-chase-lab), #ev-fire, #ev-blaze
  const ev = location.hash.match(/[#-]ev-(saw|jump|chase|fire|blaze)/);
  if (ev) {
    const t = G.train; t.coal = 3000; t.water = 15; t.sand = 200;
    t.wagons[0].slots[0] = { kind: 'P', dest: 2 }; t.wagons[3].slots[0] = { kind: 'F', dest: 3 };
    const k = ev[1];
    G.leg = ['saw', 'jump', 'chase', 'fire', 'blaze'].indexOf(k);
    G.clock = G.sched.dep[G.leg] + 60;
    if (k === 'saw') { t.pos = G.log.pos - 30; G.log.state = 'saw'; }
    if (k === 'jump') { t.pos = G.jump.pos - JUMP_RAMP; t.v = (location.hash.includes('slow') ? JUMP_KMH - 15 : JUMP_KMH + 8) / 3.6; G.jump.state = 'fly'; G.jump.v = t.v; }
    if (k === 'chase') { t.pos = G.chase.pos; t.v = 12; G.chase.state = 'fight'; }
    if (k === 'fire') { t.pos = G.dragon.pos; t.v = 12; G.dragon.state = 'fight'; }
    if (k === 'blaze') { t.pos = G.blaze.pos; t.v = 0; G.blaze.state = 'fight'; }
    Events.start(G, k);
    if (location.hash.includes('lab')) { G.ev.coalHits = 3; }
  }
  // razvojno previjanje: ff<s> odigra prvih s sekund takoj (za posnetke)
  const ff = location.hash.match(/ff([\d.]+)/);
  if (ff) for (let i = 0; i < +ff[1] * 60; i++) tick(1 / 60);
  requestAnimationFrame(frame);
}
// počakaj na pisavi (če sta dosegljivi), sicer začni z nadomestnima
Promise.race([
  Promise.all([document.fonts.load(`bold 20px ${FONT_T}`), document.fonts.load(`bold 20px ${FONT}`)]),
  new Promise(r => setTimeout(r, 1500)),
]).catch(() => {}).then(start);
