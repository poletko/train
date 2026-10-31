'use strict';
// Pogled vožnje od zgoraj (psevdo-3D): pokrajina, proga, vlak, dim, dež, predor in HUD.
const CH = 20; // segmentov na kos (za hitro izbiro vidnih predmetov)

// ---------- okrasje pokrajine ----------
function decorate(track) {
  const segs = track.segs;
  const chunks = Array.from({ length: Math.ceil(segs.length / CH) + 1 }, () => []);
  const lakes = [], rivers = [], streams = [], mountains = [];
  const r = mulberry32(4242);
  const ptAt = (i, off) => { const s = segs[i]; return [s.x - Math.sin(s.ang) * off, s.z + Math.cos(s.ang) * off]; };
  const xz = ([x, z]) => ({ x, z });
  const add = (i, k, off, sc = 1) => {
    const [x, z] = ptAt(i, off);
    chunks[Math.floor(i / CH)].push({ k, x, z, sc, ph: r() * 6.28 });
  };
  const nearStop = i => track.stops.some(st => Math.abs(i - st) * SEG < 260);
  const blocked = []; // območja brez dreves (jezero, gora)

  // jezero z otokom pri Bledu
  { const i = Math.round((track.stops[1] + track.stops[2]) / 2 - 300 / SEG); const [cx, cz] = ptAt(i, -78);
    const pts = []; for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; const rr = 52 + 10 * Math.sin(a * 3 + 1) + 6 * Math.sin(a * 5); pts.push([cx + Math.cos(a) * rr * 1.4, cz + Math.sin(a) * rr * 0.8]); }
    lakes.push({ pts }); blocked.push({ x: cx, z: cz, r: 85 });
    chunks[Math.floor(i / CH)].push({ k: 'church', x: cx, z: cz + 10, sc: 1, ph: 0 }); }
  // gora nad vsakim predorom
  for (let i = 1, a = -1; i < segs.length; i++) {
    if (segs[i].tunnel && a < 0) a = i;
    if (!segs[i].tunnel && a >= 0) {
      const b = i - 1, left = [], right = [];
      for (let k = a - 4; k <= b + 4; k += 4) {
        const w = 34 + 14 * Math.sin(k * 0.05) + 8 * Math.sin(k * 0.13);
        left.push(ptAt(k, -w)); right.push(ptAt(k, w * 0.9));
      }
      mountains.push({ a, b, poly: [...left, ...right.reverse()], portals: [a, b] });
      for (let k = a - 10; k <= b + 10; k += 6) { const [x, z] = ptAt(k, 0); blocked.push({ x, z, r: 50 }); }
      a = -1;
    }
  }
  // ceste čez prehode in vasi ob njih
  const roads = [];
  for (const i of track.crossings) {
    const pts = []; for (let o = -95; o <= 95; o += 5) pts.push(ptAt(i, o));
    const s0 = segs[i];
    roads.push({ i, pts, nx: -Math.sin(s0.ang), nz: Math.cos(s0.ang), arm: 0,
      cars: [{ u: -60, dir: 1, col: [PAL.red, PAL.blue, PAL.mustard][i % 3] }, { u: 55, dir: -1, col: [PAL.teal, '#b06ea8', PAL.leaf][i % 3] }] });
    for (let k = 0; k < 9; k++) {
      const di = Math.round((r() - 0.5) * 40), side = r() < 0.5 ? -1 : 1, off = side * (16 + r() * 30);
      if (Math.abs(di) < 4) continue;
      chunks[Math.floor((i + di) / CH)].push({ k: 'house' + Math.floor(r() * 3), ...xz(ptAt(i + di, off)), sc: 0.85 + r() * 0.3, ph: 0 });
    }
    chunks[Math.floor(i / CH)].push({ k: 'church', ...xz(ptAt(i + 12, -48)), sc: 0.8, ph: 0 });
    for (const sd of [-1, 1]) chunks[Math.floor((i - 8) / CH)].push({ k: 'fence', ...xz(ptAt(i - 8, sd * 9)), sc: 1, ph: 0 });
    for (let o = -90; o <= 90; o += 15) if (Math.abs(o) > 12) blocked.push({ x: ptAt(i, o)[0], z: ptAt(i, o)[1], r: 6 });
  }
  // zmaj z vitezom in samorog
  { const i = track.freeAt(Math.round(lerp(track.stops[2], track.stops[3], 0.46)), 15) ? Math.round(lerp(track.stops[2], track.stops[3], 0.46)) : Math.round(lerp(track.stops[2], track.stops[3], 0.88));
    chunks[Math.floor(i / CH)].push({ k: 'rider', ...xz(ptAt(i, -16)), sc: 1, ph: 0 });
    track.chasePos = i * SEG;
    blocked.push({ x: ptAt(i, -16)[0], z: ptAt(i, -16)[1], r: 16 }); }
  // zmaj in vitez pred predorom na četrtem odseku
  if (track.firePos) { const i = Math.round(track.firePos / SEG) - 6;
    chunks[Math.floor(i / CH)].push({ k: 'dragon', ...xz(ptAt(i, -19)), sc: 1, ph: 0 }, { k: 'knight', ...xz(ptAt(i + 4, -8)), sc: 1, ph: 0 });
    blocked.push({ x: ptAt(i, -20)[0], z: ptAt(i, -20)[1], r: 22 }); }
  if (track.blazePos) { const i = Math.round(track.blazePos / SEG); blocked.push({ x: ptAt(i, 20)[0], z: ptAt(i, 20)[1], r: 18 }); }
  { const i = Math.round(lerp(track.stops[1], track.stops[2], 0.3));
    chunks[Math.floor(i / CH)].push({ k: 'unicorn', ...xz(ptAt(i, 24)), sc: 1, ph: 0 });
    blocked.push({ x: ptAt(i, 24)[0], z: ptAt(i, 24)[1], r: 16 }); }
  // reka Soča (vzporedno s progo) in potoki čez progo
  { const L = 3, a = track.stops[L] + 40, b = track.stops[L + 1] - 40; const pts = [];
    for (let i = a; i <= b; i += 3) pts.push(ptAt(i, 36 + 9 * Math.sin(i * 0.02) + 4 * Math.sin(i * 0.07)));
    rivers.push({ pts, w: 11 });
  }
  for (const i of track.bridges) {
    const sp = []; for (let o = -70; o <= 50; o += 5) sp.push(ptAt(i + Math.round(Math.sin(o * 0.05) * 3), o));
    streams.push({ pts: sp, w: 6, i });
  }

  if (track.jumpPos) { const ji = Math.round(track.jumpPos / SEG);
    for (let k = ji - Math.round(JUMP_RAMP / SEG); k <= ji + Math.round((JUMP_GAP + JUMP_RAMP) / SEG); k += 3) for (let o = -120; o <= 120; o += 12) blocked.push({ x: ptAt(k, o)[0], z: ptAt(k, o)[1], r: 10 }); }
  const isBlocked = (i, off) => { const [x, z] = ptAt(i, off); return blocked.some(b => Math.hypot(b.x - x, b.z - z) < b.r) || (rivers.length && Math.abs(off - 36) < 14 && segs[i].leg === 3); };
  for (let i = 2; i < segs.length - 2; i++) {
    const s = segs[i];
    if (s.tunnel) continue;
    const ns = nearStop(i);
    if (i % 17 === 0 && !s.bridge && !(track.jumpPos && Math.abs(i * SEG - track.jumpPos - JUMP_GAP / 2) < JUMP_GAP / 2 + JUMP_RAMP + 6)) add(i, 'pole', -6);
    for (const side of [-1, 1]) {
      const off = side * (9 + r() * r() * 70);
      if (isBlocked(i, off)) continue;
      if (ns && side > 0 && off < 34) continue;  // prostor za postajo in peron
      const t = r();
      if (s.leg === 0) {
        if (t < 0.10) add(i, r() < 0.5 ? 'tree' : 'tree2', off, 0.85 + r() * 0.4);
        else if (t < 0.13) add(i, 'bush', off); else if (t < 0.2) add(i, 'flowers', off);
        else if (t < 0.235 && !ns) { for (let k = 0; k < 3; k++) add(i + k * 2, r() < 0.7 ? 'cow' : 'sheep', off + side * k * 5); }
        else if (t < 0.225 && !ns) add(i, 'fence', side * 7.5);
      } else if (s.leg === 1) {
        if (t < 0.12) add(i, r() < 0.5 ? 'pine' : 'tree2', off, 0.85 + r() * 0.4);
        else if (t < 0.16) add(i, 'bush', off); else if (t < 0.19) add(i, 'flowers', off);
        else if (t < 0.2 && !ns) add(i, 'cow', off);
      } else if (s.leg === 2) {
        if (t < 0.24) add(i, 'pine', off, 0.8 + r() * 0.5); else if (t < 0.27) add(i, 'rock', off);
      } else if (s.leg === 3) {
        if (t < 0.14) add(i, 'pine', off, 0.8 + r() * 0.5); else if (t < 0.2) add(i, 'rock', off, 0.8 + r() * 0.6);
      } else {
        if (t < 0.10 && Math.abs(off) > 12) add(i, 'vines', off); else if (t < 0.14) add(i, 'cypress', off, 0.9 + r() * 0.3);
        else if (t < 0.15 && !ns) add(i, 'cow', off);
        else if (t < 0.16) add(i, 'tree2', off);
      }
      if (ns && r() < 0.035) add(i, 'house' + Math.floor(r() * 3), side * (side > 0 ? 40 : 18) + side * r() * 30);
    }
  }
  // postaje
  track.stops.forEach((st, k) => {
    add(st - Math.round(55 / SEG), 'station' + k, 15);
    add(st, 'stopboard', -3.8);
    add(st - Math.round(17 / SEG), 'watertower', -9);
    add(st - Math.round(30 / SEG), 'coalpile', -9);
  });
  for (const sg of track.signs) add(sg.i, 'sign' + sg.v, -4, 1);
  track.chunks = chunks; track.roads = roads; track.lakes = lakes; track.rivers = rivers; track.streams = streams; track.mountains = mountains;
}

const World = (() => {
  let tiles = null;
  const puffs = [], drops = [], splashes = [];
  const cam = { x: 0, z: 0, init: false };
  let dist = 0;

  function init() {
    tiles = {
      green: FX.grassTile(PAL.grass, PAL.grassDark, '#d6cf8a', 1),
      rain: FX.grassTile('#9aa36a', '#6d7a46', '#b9b98a', 2),
      gold: FX.grassTile('#c7b96e', '#9b8a4a', '#e6d690', 3),
      forest: FX.grassTile('#97a65e', '#5f7340', '#c2c27e', 4),
    };
    for (let i = 0; i < 140; i++) drops.push({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 0.6 });
  }

  // pozicije vagonov (središče, kot) iz položaja lokomotive
  function carList(t) {
    const list = [{ type: 'loco', off: 6.5 }, { type: 'tender', off: 17.3 }];
    t.wagons.forEach((w, k) => list.push({ type: w.type, off: 27.6 + 12.8 * k, wagon: w }));
    return list;
  }
  function carPose(track, s, L) {
    const a = trackPoint(track, s - L / 2), b = trackPoint(track, s + L / 2);
    return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, ang: Math.atan2(b.z - a.z, b.x - a.x) };
  }

  function emit(G, kind) {
    const t = G.train, p = trackPoint(G.track, t.pos - 1.5);
    const dirty = 1 - t.combEff;
    if (kind === 'chuff') puffs.push({ x: p.x, z: p.z, h: 5, vx: (Math.random() - 0.5) * 1.5, vz: (Math.random() - 0.5) * 1.5, vh: 5 + Math.abs(t.v) * 0.2, r: 0.9, life: 1.6, max: 1.6, col: dirty > 0.15 ? '#5a524a' : PAL.cloud });
    else if (kind === 'steam') { const q = trackPoint(G.track, t.pos - 4.5); puffs.push({ x: q.x, z: q.z, h: 4.5, vx: (Math.random() - 0.5) * 4, vz: (Math.random() - 0.5) * 4, vh: 7, r: 0.5, life: 0.7, max: 0.7, col: PAL.white }); }
    else if (kind === 'spark') { const q = trackPoint(G.track, t.pos - 6, (Math.random() < 0.5 ? -1 : 1) * 1.7); puffs.push({ x: q.x, z: q.z, h: 0.5, vx: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6, vh: 4, r: 0.25, life: 0.35, max: 0.35, col: PAL.yellow, spark: true }); }
  }

  function dust(x, z, col = '#d8c69a') {
    puffs.push({ x, z, h: 0.3, vx: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3, vh: 2.5, r: 0.8, life: 0.9, max: 0.9, col });
  }
  function startCrash(G, kind) {
    const t = G.train, tr = G.track, v = t.v;
    const seg = segAt(tr, t.pos);
    const cars = carList(t).map((c, k) => {
      const L = CAR_DIM[c.type].L, p = carPose(tr, t.pos - c.off, L);
      return { type: c.type, wagon: c.wagon, s: t.pos - c.off, x: p.x, z: p.z, ang: p.ang, vx: Math.cos(p.ang) * v, vz: Math.sin(p.ang) * v, va: 0, h: 0, vh: 0, sink: 0, falling: false };
    });
    const cr = { kind, t: 0, cars, debris: [], v: Math.abs(v), dir: Math.sign(v) || 1, burst: null };
    if (kind === 'derail') {
      const out = -Math.sign(seg.curve || 1);
      cars.forEach((c, k) => {
        const nx = -Math.sin(c.ang), nz = Math.cos(c.ang), kick = (0.3 + 0.25 * Math.random()) * cr.v * (k === 0 ? 1.2 : 1);
        c.vx += nx * out * kick; c.vz += nz * out * kick;
        c.va = (k % 2 ? -1 : 1) * out * (1 + Math.random() * 1.8); c.vh = 3 + Math.random() * 4;
      });
      cr.burst = { x: cars[0].x, z: cars[0].z, text: 'KRAH!' };
    } else {
      const bi = tr.bridges.reduce((a, b) => Math.abs(b * SEG - t.pos) < Math.abs(a * SEG - t.pos) ? b : a);
      cr.bridgeI = bi; cr.gapS = bi * SEG - 6;
      const p = trackPoint(tr, bi * SEG);
      cr.burst = { x: p.x, z: p.z, text: 'ŠTRBUNK!' };
      for (let k = 0; k < 16; k++) cr.debris.push({ x: p.x + (Math.random() - 0.5) * 10, z: p.z + (Math.random() - 0.5) * 8, h: 0.5, vx: (Math.random() - 0.5) * 9, vz: (Math.random() - 0.5) * 9, vh: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 12 });
    }
    G.crash = cr;
  }
  function updateCrash(G, dt) {
    const cr = G.crash, tr = G.track;
    cr.t += dt;
    const vcur = Math.max(0, cr.v - 3 * cr.t);
    for (const c of cr.cars) {
      if (cr.kind === 'derail') {
        c.vh -= 20 * dt; c.h += c.vh * dt;
        if (c.h <= 0) { if (c.vh < -3) for (let k = 0; k < 4; k++) dust(c.x, c.z); c.h = 0; c.vh = Math.abs(c.vh) > 3 ? -c.vh * 0.35 : 0; }
        const sp = Math.hypot(c.vx, c.vz), k = sp > 0 ? Math.max(0, sp - 9 * dt) / sp : 0;
        c.vx *= k; c.vz *= k; c.va *= Math.max(0, 1 - dt * 1.3);
        c.x += c.vx * dt; c.z += c.vz * dt; c.ang += c.va * dt;
        if (sp > 3 && Math.random() < dt * 10) dust(c.x, c.z);
      } else if (!c.falling) {
        c.s += vcur * cr.dir * dt;
        const p = carPose(tr, c.s, CAR_DIM[c.type].L);
        c.x = p.x; c.z = p.z; c.ang = p.ang;
        if (c.s * cr.dir >= cr.gapS * cr.dir) {
          c.falling = true; c.vx = Math.cos(c.ang) * vcur * 0.5 * cr.dir; c.vz = Math.sin(c.ang) * vcur * 0.5 * cr.dir;
          for (let k = 0; k < 10; k++) dust(c.x, c.z, PAL.water2);
          Snd.splash && Snd.splash();
        }
      } else {
        c.sink = Math.min(1, c.sink + dt * 0.8); c.x += c.vx * dt; c.z += c.vz * dt; c.vx *= 0.97; c.vz *= 0.97;
        if (Math.random() < dt * 6) dust(c.x, c.z, PAL.water2);
      }
    }
    for (const d of cr.debris) {
      d.vh -= 15 * dt; d.h = Math.max(-1.5, d.h + d.vh * dt); d.x += d.vx * dt; d.z += d.vz * dt; d.a += d.va * dt;
      if (d.h <= 0) { d.vx *= 0.9; d.vz *= 0.9; d.va *= 0.9; }
    }
  }

  function update(G, dt) {
    const t = G.train;
    if (G.crash) updateCrash(G, dt);
    for (const rd of G.track.roads || []) {
      const d = rd.i * SEG - t.pos;
      const down = (d < 170 && d > -70) || (G.crash && Math.abs(d) < 200);
      rd.arm = clamp(rd.arm + (down ? 1 : -1) * dt * 1.2, 0, 1);
      for (const c of rd.cars) {
        const ahead = c.u * c.dir;                 // < 0 pred prehodom
        const wait = rd.arm > 0.05 && ahead > -16 && ahead < -9;
        if (!wait) c.u += c.dir * 9 * dt;
        if (c.u * c.dir > 95) c.u = -95 * c.dir;
      }
    }
    for (const c of G.kids || []) if (c.happy > 0) c.happy += dt;
    for (const c of G.challenges || []) if (c.state === 'flee') {
      c.t += dt;
      for (const sh of c.flock) { sh.off += sh.dir * 9 * dt; sh.hop = Math.abs(Math.sin(c.t * 9 + sh.ph)) * 0.8; }
      if (c.t > 4) c.state = 'gone';
    }
    dist += Math.abs(t.v) * dt;
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.x += p.vx * dt; p.z += p.vz * dt; p.h += p.vh * dt; p.vh *= 1 - dt * 0.8;
      p.r += dt * (p.spark ? 0 : 1.6); p.life -= dt;
      if (p.life <= 0) puffs.splice(i, 1);
    }
    if (G.mode === 'drive' && !G.quiz) {
      if (t.valve > 0 && Math.random() < 0.5) emit(G, 'steam');
      if (t.brake > 0.5 && Math.abs(t.v) > 3 && Math.random() < 0.5) emit(G, 'spark');
      if (Math.random() < dt * 1.5) emit(G, 'chuff');
    }
    // kamera gleda nekoliko naprej
    const p = G.crash ? { x: G.crash.cars[0].x, z: G.crash.cars[0].z } : trackPoint(G.track, t.pos + (8 + Math.abs(t.v) * 1.3) * Math.sign(t.dir || 1));
    const tx = p.x * PX - W / 2, tz = p.z * PX - H * 0.4;
    if (!cam.init) { cam.x = tx; cam.z = tz; cam.init = true; }
    const k = Math.min(1, dt * 3);
    cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k;
  }
  function snap() { cam.init = false; }

  function mood(G) {
    const t = G.train, lvl = t.boilerWater / TRAIN.boilerWaterCap;
    const seg = segAt(G.track, t.pos);
    if (t.slipping) return ['dizzy', 'Drsi mi! Pesek!'];
    if (Math.abs(t.v) * 3.6 > seg.limit + 2) return ['angry', 'Prehitro!'];
    if (lvl < 0.2) return ['worried', 'Žejen sem! Vode!'];
    if (t.valve > 0) return ['hot', 'Uf, prevroče mi je!'];
    if (t.P < 6) return ['worried', 'Lačen sem! Premoga!'];
    if (t.priming) return ['worried', 'Preveč vode, grgram!'];
    return ['happy', null];
  }

  function draw(g, G) {
    const tr = G.track, t = G.train, segs = tr.segs;
    const cx = cam.x, cz = cam.z;
    const sx = x => x * PX - cx, sy = z => z * PX - cz;
    const seg = segAt(tr, t.pos);
    const shake = G.crash ? Math.max(0, 1 - G.crash.t / 1.5) * 9 : (seg.bridge && Math.abs(t.v) * 3.6 > seg.limit + 5 ? 2.5 : 0);
    g.save();
    if (shake) g.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
    const leg = seg.leg;
    // podlaga
    const tile = seg.rain ? tiles.rain : leg === 4 ? tiles.gold : leg === 2 ? tiles.forest : tiles.green;
    g.save();
    g.fillStyle = g.createPattern(tile, 'repeat');
    g.translate(-((cx % 512) + 512) % 512, -((cz % 512) + 512) % 512);
    g.fillRect(0, 0, W + 512, H + 512);
    g.restore();

    // voda
    const onScreen = (x, y, m = 200) => x > -m && x < W + m && y > -m && y < H + m;
    for (const lk of tr.lakes) {
      if (!lk.pts.some(([x, z]) => onScreen(sx(x), sy(z), 400))) continue;
      const pts = lk.pts.flatMap(([x, z]) => [sx(x), sy(z)]);
      inkPoly(g, pts, PAL.water, 5, 1.5, 1);
      g.save(); g.beginPath(); pts.forEach((v, i) => { if (i % 2 === 0) i ? g.lineTo(pts[i], pts[i + 1]) : g.moveTo(pts[i], pts[i + 1]); }); g.clip();
      for (let k = 0; k < 14; k++) {
        const wx = pts[0] + ((k * 97) % 600) - 300 + Math.sin(BEAT * 0.5 + k) * 8, wy = pts[1] + ((k * 53) % 300) - 150;
        inkLine(g, [wx, wy, wx + 8, wy - 4, wx + 16, wy], 2, PAL.water2, 0.4, k);
      }
      g.restore();
    }
    const ribbon = (pts, w) => {
      const sp = pts.flatMap(([x, z]) => [sx(x), sy(z)]);
      if (!pts.some(([x, z]) => onScreen(sx(x), sy(z), 300))) return;
      g.beginPath(); for (let i = 0; i < sp.length; i += 2) i ? g.lineTo(sp[i], sp[i + 1]) : g.moveTo(sp[i], sp[i + 1]);
      stroke(g, w * PX + 8); stroke(g, w * PX, PAL.water);
      g.setLineDash([10, 22]); g.lineDashOffset = -BEAT * 12; stroke(g, 2.5, PAL.water2); g.setLineDash([]);
    };
    for (const rv of tr.rivers) ribbon(rv.pts, rv.w);
    for (const rd of tr.roads) {
      if (!rd.pts.some(([x, z]) => onScreen(sx(x), sy(z), 200))) continue;
      const sp = rd.pts.flatMap(([x, z]) => [sx(x), sy(z)]);
      g.beginPath(); for (let i = 0; i < sp.length; i += 2) i ? g.lineTo(sp[i], sp[i + 1]) : g.moveTo(sp[i], sp[i + 1]);
      stroke(g, 6 * PX + 6); stroke(g, 6 * PX, '#8f877b');
      g.setLineDash([14, 14]); stroke(g, 3, PAL.cream); g.setLineDash([]);
    }
    for (const st of tr.streams) ribbon(st.pts, st.w);

    // proga
    const i0 = Math.max(0, segIndex(tr, t.pos) - 70), i1 = Math.min(segs.length - 1, segIndex(tr, t.pos) + 60);
    const line = (off, from = i0, to = i1) => { const a = []; for (let i = from; i <= to; i++) { const s = segs[i]; a.push(sx(s.x - Math.sin(s.ang) * off), sy(s.z + Math.cos(s.ang) * off)); } return a; };
    const poly = (a) => { g.beginPath(); for (let i = 0; i < a.length; i += 2) i ? g.lineTo(a[i], a[i + 1]) : g.moveTo(a[i], a[i + 1]); };
    // peron
    for (const st of tr.stops) {
      const a = Math.max(i0, st - Math.round(130 / SEG)), b = Math.min(i1, st + Math.round(15 / SEG));
      if (a >= b) continue;
      const inner = line(2.6, a, b), outer = line(9, a, b);
      const pts = [...inner]; for (let i = outer.length - 2; i >= 0; i -= 2) pts.push(outer[i], outer[i + 1]);
      inkPoly(g, pts, '#8a8070', 3, 0.5, 3);
      inkPoly(g, pts.map((v, i) => i % 2 ? v - 6 : v), '#e6d6b0', 3, 0.5, 4);
      g.setLineDash([3, 14]); poly(line(5.6, a, b).map((v, i) => i % 2 ? v - 6 : v)); stroke(g, 1.5, 'rgba(29,22,17,0.4)'); g.setLineDash([]);
      poly(line(3.0, a, b).map((v, i) => i % 2 ? v - 6 : v)); stroke(g, 4, PAL.yellow);
    }
    const center = line(0);
    poly(center); stroke(g, 4.2 * PX + 6); stroke(g, 4.2 * PX, PAL.ballast);
    // mostovi
    for (let i = i0; i < i1; i++) if (segs[i].bridge && !segs[i - 1].bridge) {
      const a = i, b = i + 6;
      poly(line(0, a, b)); stroke(g, 5.5 * PX + 6); stroke(g, 5.5 * PX, PAL.wood);
      for (const off of [-2.9, 2.9]) { poly(line(off, a, b)); stroke(g, 3, INK); }
    }
    // pragovi
    g.strokeStyle = PAL.sleeper; g.lineWidth = 5; g.lineCap = 'butt';
    g.beginPath();
    for (let i = i0; i < i1; i++) {
      const s = segs[i], c = Math.cos(s.ang), sn = Math.sin(s.ang);
      for (const f of [0, 0.5]) {
        const x = s.x + c * SEG * f, z = s.z + sn * SEG * f;
        g.moveTo(sx(x + sn * 1.6), sy(z - c * 1.6)); g.lineTo(sx(x - sn * 1.6), sy(z + c * 1.6));
      }
    }
    g.stroke();
    g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
    for (const off of [-0.85, 0.85]) { poly(line(off)); stroke(g, 4, INK); stroke(g, 1.5, '#d8d0c0'); }
    for (const rd of tr.roads) {
      if (rd.i < i0 || rd.i > i1) continue;
      const q = segs[rd.i], c = Math.cos(q.ang), sn = Math.sin(q.ang);
      const P = (u, n) => [sx(q.x + c * u - sn * n), sy(q.z + sn * u + c * n)];
      inkPoly(g, [...P(-3, -2.6), ...P(3, -2.6), ...P(3, 2.6), ...P(-3, 2.6)], '#8f877b', 2, 0.4, rd.i);
      for (const n of [-0.85, 0.85]) inkLine(g, [...P(-3, n), ...P(3, n)], 3, INK, 0.2);
    }
    Events.ground(g, G, sx, sy);
    if (G.crash && G.crash.kind === 'bridge') {
      const st = tr.streams.find(s => s.i === G.crash.bridgeI);
      if (st) ribbon(st.pts.slice(9, 19), st.w + 2.5);
      for (const e of [G.crash.bridgeI - 3, G.crash.bridgeI + 3]) {
        const q = segs[e], c = Math.cos(q.ang), sn = Math.sin(q.ang);
        for (const n of [-1, 1]) inkPoly(g, [sx(q.x + sn * 2 * n), sy(q.z - c * 2 * n), sx(q.x + c * 2 * (e < G.crash.bridgeI ? 1 : -1) + sn * 2.4 * n), sy(q.z + sn * 2 * (e < G.crash.bridgeI ? 1 : -1) - c * 2.4 * n), sx(q.x + sn * 2.8 * n), sy(q.z - c * 2.8 * n)], PAL.wood, 2.5, 0.8, e + n);
      }
    }

    // predmeti, znaki, vagoni → razvrščeni po globini
    const list = [];
    const c0 = Math.floor(i0 / CH), c1 = Math.floor(i1 / CH);
    for (let c = Math.max(0, c0 - 3); c <= Math.min(tr.chunks.length - 1, c1 + 3); c++) {
      for (const o of tr.chunks[c]) {
        const x = sx(o.x), y = sy(o.z);
        if (x < -160 || x > W + 160 || y < -40 || y > H + 160) continue;
        list.push({ y, o, x });
      }
    }
    const [md, say] = mood(G);
    const blink = hsh(Math.floor(BEAT * 2)) < 0.07;
    let locoScreen = null;
    if (G.crash) {
      for (const c of G.crash.cars) list.push({ y: sy(c.z) + 2, car: c, x: sx(c.x), ang: c.ang, wreck: c });
    } else for (const c of carList(t)) {
      const L = CAR_DIM[c.type].L;
      const p = carPose(tr, t.pos - c.off, L);
      const x = sx(p.x), y = sy(p.z);
      if (c.type === 'loco') locoScreen = [x, y];
      list.push({ y: y + 2, car: c, x, ang: p.ang });
    }
    for (const rd of tr.roads) {
      if (Math.abs(rd.i * SEG - t.pos) > 260) continue;
      const q = segs[rd.i];
      for (const sd of [-1, 1]) {
        const p = trackPoint(tr, rd.i * SEG - sd * 5, sd * 4.2);
        list.push({ y: sy(p.z), x: sx(p.x), barrier: rd, ux: Math.cos(q.ang) * sd * PX, uy: Math.sin(q.ang) * sd * PX });
      }
      for (const c of rd.cars) {
        const x = segs[rd.i].x + rd.nx * c.u + Math.cos(q.ang) * c.dir * -1.6, z = segs[rd.i].z + rd.nz * c.u + Math.sin(q.ang) * c.dir * -1.6;
        list.push({ y: sy(z), x: sx(x), roadCar: c, ang: Math.atan2(rd.nz * c.dir, rd.nx * c.dir) });
      }
    }
    for (const c of G.kids || []) {
      if (Math.abs(c.pos - t.pos) > 260) continue;
      c.list.forEach((kd, k) => { const p = trackPoint(tr, c.pos + kd.dz, c.off + kd.doff); list.push({ y: sy(p.z), x: sx(p.x), kid: kd, grp: c, k }); });
    }
    for (const c of G.challenges || []) {
      if (c.state === 'gone' || Math.abs(c.pos - t.pos) > 260) continue;
      c.flock.forEach((sh, k) => {
        const p = trackPoint(tr, c.pos + sh.dz, sh.off);
        list.push({ y: sy(p.z), x: sx(p.x), sheep: sh, ch: c, k });
      });
    }
    if (G.depot && Math.abs(G.depot.pos - t.pos) < 300) {
      for (const [k, dz, off] of [['depot', 0, 15], ['coalpile', -14, 9], ['stopboard', 0, -3.8]]) {
        const p = trackPoint(tr, G.depot.pos + dz, off);
        list.push({ y: sy(p.z), x: sx(p.x), o: { k, sc: 1, ph: 0 } });
      }
    }
    Events.items(G, sx, sy, list);
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.draw) it.draw(g);
      else if (it.wreck) {
        const c = it.wreck;
        g.save(); g.globalAlpha = 1 - c.sink * 0.85;
        drawCar(g, c.type, it.x, it.y - c.h * PX * ZK + c.sink * 18, it.ang, PX, { dist: dist + G.crash.t * 30, mood: 'dizzy', coal: t.coal, water: t.water, slots: c.wagon ? c.wagon.slots : null });
        g.restore();
      } else if (it.car) {
        drawCar(g, it.car.type, it.x, it.y, it.ang, PX, { dist, mood: md, blink, coal: t.coal, water: t.water, slots: it.car.wagon ? it.car.wagon.slots : null });
      } else if (it.barrier) {
        drawBarrier(g, it.x, it.y, it.ux, it.uy, 4.6, it.barrier.arm);
      } else if (it.roadCar) {
        drawRoadCar(g, it.x, it.y, it.ang, it.roadCar.col, it.k || 1);
      } else if (it.kid) {
        const kd = it.kid, hp = it.grp.happy;
        const jump = hp > 0 && hp < 4 ? Math.abs(Math.sin(hp * 8 + it.k)) * 14 : 0;
        drawToon(g, it.x, it.y - jump, { shirt: kd.shirt, pants: '#5a4a3a', hat: kd.hat, hatCol: kd.hatCol, sc: 0.62, face: kd.face, seed: kd.seed, wave: true, mood: hp > 0 ? 'happy' : 'oh' });
        if (hp > 0 && hp < 2.5 && it.k === 0) bubble(g, it.x, it.y - 70, 'Juhuuu!', 16);
        if (hp <= 0 && it.k === 1 && Math.abs(it.grp.pos - t.pos) < 160) bubble(g, it.x, it.y - 64, 'Pisk-pisk!', 14);
      } else if (it.sheep) {
        const img = spr('sheep'), sh = it.sheep, f = sh.dir < 0 ? -1 : 1;
        g.save(); g.translate(it.x, it.y - (sh.hop || 0) * 14); g.scale(it.ch.state === 'flee' ? f : 1, 1);
        g.drawImage(img, -img.width / 2, -img.height + 6); g.restore();
        if (it.ch.state === 'flee' && it.k % 2 === 0 && it.ch.t < 2) bubble(g, it.x, it.y - 44, 'Beee!', 15);
      } else {
        const o = it.o;
        if (o.k === 'dragon') { if (!G.dragon || G.dragon.state === 'idle') drawDragon(g, it.x, it.y, G.time + o.ph, 1); continue; }
        if (o.k === 'rider') { if (!G.chase || G.chase.state === 'idle') drawRider(g, it.x, it.y, G.time, 1, 0.7, { idle: true }); continue; }
        if (o.k === 'knight') { drawKnight(g, it.x, it.y, G.time + o.ph, -1); continue; }
        if (o.k === 'unicorn') { drawUnicorn(g, it.x, it.y, G.time + o.ph); continue; }
        const img = o.k.startsWith('sign') ? signSprite(+o.k.slice(4)) : spr(o.k);
        if (!img) continue;
        const bounce = (o.k === 'tree' || o.k === 'tree2' || o.k === 'pine' || o.k === 'cow' || o.k === 'sheep' || o.k === 'bush') ? Math.sin(BEAT * Math.PI + o.ph) : 0;
        const w = img.width * o.sc, h = img.height * o.sc * (1 + bounce * 0.035);
        g.drawImage(img, it.x - w / 2, it.y - h + 6 * o.sc, w * (1 - bounce * 0.015), h);
      }
    }

    // gora s predorom
    for (const m of tr.mountains) {
      const pts = m.poly.flatMap(([x, z]) => [sx(x), sy(z)]);
      if (!m.poly.some(([x, z]) => onScreen(sx(x), sy(z), 300))) continue;
      const inside = seg.tunnel || segAt(tr, t.pos - 40).tunnel;
      g.globalAlpha = inside ? 0.55 : 1;
      inkPoly(g, pts, '#7d8a4e', 4, 1.2, 5);
      inkPoly(g, pts.map((v, i) => i % 2 ? v - 18 : v), '#94a05a', 4, 1.2, 6);
      // gosti vrhovi s snegom (od zadaj naprej)
      const n = m.poly.length, peaks = [];
      for (let k = 1; k < n / 2 - 1; k++) {
        const [x, z] = m.poly[k], [x2, z2] = m.poly[n - 1 - k];
        for (const f of [0.28, 0.5, 0.72]) {
          const h = hsh(k * 3 + f * 10);
          peaks.push({ x: sx(lerp(x, x2, f)) + (h - 0.5) * 30, y: sy(lerp(z, z2, f)), s: 55 + h * 75, k: k * 3 + f * 10 });
        }
      }
      peaks.sort((a, b) => a.y - b.y);
      for (const p of peaks) {
        if (!onScreen(p.x, p.y, 150)) continue;
        const { x, y, s: sz } = p;
        inkPoly(g, [x - sz * 0.8, y, x - sz * 0.05, y - sz, x + sz * 0.75, y], PAL.rock, 3, 0.8, p.k);
        inkPoly(g, [x - sz * 0.05, y - sz, x + sz * 0.75, y, x + sz * 0.15, y], PAL.rock2, 0, 0.6, p.k + 1);
        inkPoly(g, [x - sz * 0.3, y - sz * 0.62, x - sz * 0.05, y - sz, x + sz * 0.27, y - sz * 0.6, x + sz * 0.08, y - sz * 0.68, x - sz * 0.1, y - sz * 0.56], PAL.snow, 2.5, 0.5, p.k + 2);
      }
      g.globalAlpha = 1;
      for (const pi of m.portals) {
        const s = segs[pi];
        const x = sx(s.x), y = sy(s.z);
        if (!onScreen(x, y)) continue;
        inkPoly(g, [x - 34, y + 4, x - 34, y - 30, x - 20, y - 46, x + 20, y - 46, x + 34, y - 30, x + 34, y + 4], '#b5a994', 3.5, 0.6, pi);
        inkPoly(g, [x - 20, y + 4, x - 20, y - 24, x - 10, y - 34, x + 10, y - 34, x + 20, y - 24, x + 20, y + 4], '#15100c', 3, 0.5, pi + 1);
      }
    }

    // dim in iskre
    for (const p of puffs) {
      const x = sx(p.x), y = sy(p.z) - p.h * PX * ZK;
      const pop = p.life < 0.25 ? p.life / 0.25 : 1;
      const r = p.r * PX * pop;
      if (p.spark) { g.fillStyle = PAL.yellow; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); continue; }
      if (r < 1.5) continue;
      blobs(g, [[x, y, r], [x - r * 0.6, y + r * 0.3, r * 0.7], [x + r * 0.6, y + r * 0.25, r * 0.65]], p.col, 2.5, Math.floor(p.max * 100));
    }
    if (say && locoScreen && !G.crash) bubble(g, locoScreen[0] + 30, locoScreen[1] - 70, say, 20);
    if (G.crash) {
      for (const d of G.crash.debris) {
        const x = sx(d.x), y = sy(d.z) - Math.max(0, d.h) * PX * ZK;
        g.save(); g.translate(x, y); g.rotate(d.a); g.globalAlpha = d.h < 0 ? Math.max(0, 1 + d.h / 1.5) : 1;
        inkPoly(g, [-12, -3, 12, -3, 12, 3, -12, 3], PAL.wood, 2, 0.4, Math.floor(d.a)); g.restore();
      }
      const b = G.crash.burst, bt = G.crash.t;
      if (b && bt < 2.2) {
        const sc = bt < 0.25 ? bt / 0.25 * 1.2 : 1.2 - Math.min(0.2, (bt - 0.25));
        g.save(); g.translate(sx(b.x) + 40, sy(b.z) - 90); g.scale(sc, sc); g.rotate(-0.1);
        const p = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = k % 2 ? 62 : 100; p.push(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.75); }
        inkPoly(g, p, PAL.yellow, 4, 2, 77);
        toonText(g, b.text, 0, 0, 44, PAL.red, 'center', FONT_T, 7);
        g.restore();
      }
    }

    // dež
    if (seg.rain && !seg.tunnel) {
      g.fillStyle = 'rgba(60,70,90,0.18)'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(230,240,255,0.75)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath();
      for (const d of drops) {
        d.y += 14 * d.s; d.x -= 4 * d.s;
        if (d.y > H) { d.y = -10; d.x = Math.random() * (W + 100); if (Math.random() < 0.5) splashes.push({ x: Math.random() * W, y: Math.random() * H, t: 0.3 }); }
        if (d.x < 0) d.x += W;
        g.moveTo(d.x, d.y); g.lineTo(d.x + 3, d.y - 12 * d.s);
      }
      g.stroke();
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i]; s.t -= 1 / 60;
        g.beginPath(); g.ellipse(s.x, s.y, (0.3 - s.t) * 30, (0.3 - s.t) * 10, 0, 0, 7); stroke(g, 1.5, 'rgba(230,240,255,0.7)');
        if (s.t <= 0) splashes.splice(i, 1);
      }
      const cl = spr('raincloud');
      if (cl) g.drawImage(cl, 70 + Math.sin(BEAT * 0.25) * 40, 70 + Math.sin(BEAT * Math.PI) * 4, 210, 112);
    }
    if (seg.tunnel) { g.fillStyle = 'rgba(20,14,10,0.35)'; g.fillRect(0, 0, W, H); }
    g.restore();
  }

  function bubble(g, x, y, txt, size = 20) {
    g.font = `bold ${size}px ${FONT}`;
    const w = g.measureText(txt).width + 28, h = size + 22;
    x = clamp(x, w / 2 + 10, W - w / 2 - 10); y = clamp(y, h + 10, H - 220);
    g.beginPath();
    g.ellipse(x, y, w / 2 + 6, h / 2 + 4, 0, 0, Math.PI * 2);
    g.moveTo(x - 14, y + h / 2); g.lineTo(x - 26, y + h / 2 + 18); g.lineTo(x - 2, y + h / 2 + 2);
    g.fillStyle = PAL.white; g.fill(); stroke(g, 3.5);
    g.fillStyle = PAL.white; g.beginPath(); g.ellipse(x, y, w / 2 + 4, h / 2 + 2, 0, 0, 7); g.fill();
    plainText(g, txt, x, y + 1, size, INK, 'center');
  }

  return { init, update, draw, emit, snap, carList, bubble, mood, startCrash, dust };
})();

// ---------- HUD (risankaste kartice) ----------
const HUD = (() => {
  function dial(g, x, y, r, v, lo, hi, label, zones, seed) {
    inkEllipse(g, x, y, r + 6, r + 6, PAL.brass, 3.5, seed);
    inkEllipse(g, x, y, r, r, PAL.white, 2.5, seed + 1);
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const ang = q => a0 + (a1 - a0) * clamp((q - lo) / (hi - lo), 0, 1);
    for (const [from, to, col] of zones) { g.beginPath(); g.arc(x, y, r * 0.8, ang(from), ang(to)); stroke(g, r * 0.22, col); }
    for (let k = 0; k <= 8; k++) { const a = a0 + (a1 - a0) * k / 8; inkLine(g, [x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92], 2, INK, 0.3, k); }
    const a = ang(v) + Math.sin(BEAT * Math.PI * 4) * 0.02;
    inkLine(g, [x, y, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85], 4, PAL.red2, 0.3, seed + 3);
    inkEllipse(g, x, y, 5, 5, INK, 0, seed + 4);
    toonText(g, label, x, y + r * 0.5, r * 0.36, PAL.cream);
  }
  function lever(g, x, y, h, v, col, label, seed) {
    inkPoly(g, [x - 7, y, x + 7, y, x + 7, y + h, x - 7, y + h], '#3a302a', 2.5, 0.4, seed);
    const ky = y + h * (1 - clamp(v, 0, 1));
    inkLine(g, [x, y + h, x, ky], 3, '#777', 0.3);
    inkEllipse(g, x, ky, 11, 9, col, 3, seed + 1);
    plainText(g, label, x, y + h + 13, 11, INK, 'center');
  }
  // ikona gumba + napis pod kontrolo
  function tag(g, x, y, btn, label) {
    btnGlyph(g, x, y, btn, 10);
    if (label) plainText(g, label, x, y + 19, 11, INK, 'center');
  }
  function drawP1(g, G) {
    const t = G.train, tr = G.track;
    const x = 12, y = H - 172, seg = segAt(tr, t.pos);
    card(g, x, y, 476, 162, PAL.cream, 11);
    drawToon(g, x + 50, y + 150, { shirt: PAL.red, pants: PAL.navy, hat: 'cap', hatCol: PAL.blue, sc: 1.1, seed: 3, wave: t.whistle, mood: Math.abs(t.v) * 3.6 > seg.limit + 2 ? 'oh' : 'happy' });
    plainText(g, 'STROJEVODJA', x + 50, y + 16, 13, PAL.red2, 'center');
    dial(g, x + 160, y + 80, 52, Math.abs(t.v) * 3.6, 0, 100, Math.round(Math.abs(t.v) * 3.6) + '', [[0, seg.limit, '#9cc58a'], [seg.limit, 100, '#e58a74']], 21);
    plainText(g, 'km/h', x + 160, y + 146, 12, INK, 'center');
    inkEllipse(g, x + 248, y + 40, 23, 23, PAL.white, 3, 31);
    g.beginPath(); g.arc(x + 248, y + 40, 18, 0, 7); stroke(g, 5, PAL.red);
    plainText(g, String(seg.limit), x + 248, y + 41, 16, INK, 'center');
    const nl = nextLimit(tr, t.pos, 600);
    if (nl) {
      inkEllipse(g, x + 248, y + 96, 14, 14, PAL.white, 2.5, 32);
      g.beginPath(); g.arc(x + 248, y + 96, 11, 0, 7); stroke(g, 3.5, PAL.red);
      plainText(g, String(nl.limit), x + 248, y + 97, 11, INK, 'center');
      plainText(g, `čez ${Math.round(nl.dist / 10) * 10} m`, x + 248, y + 122, 11, INK, 'center');
    }
    lever(g, x + 300, y + 26, 82, t.reg, PAL.mustard, 'PARA', 41);
    tag(g, x + 300, y + 140, 'L↕');
    lever(g, x + 340, y + 26, 82, t.brake, PAL.red, 'ZAVORA', 42);
    tag(g, x + 340, y + 140, 'LT');
    const sacks = Math.ceil(t.sand / 50);
    for (let k = 0; k < Math.min(6, sacks); k++) sackIcon(g, x + 382, y + 110 - k * 14, 9, 50 + k);
    plainText(g, 'PESEK', x + 382, y + 122, 11, t.sanding ? PAL.red : INK, 'center');
    tag(g, x + 382, y + 140, 'A');
    // piščalka in smer
    const wy = y + 34 + (t.whistle ? Math.sin(BEAT * 20) * 2 : 0);
    inkPoly(g, [x + 420, wy + 8, x + 446, wy + 2, x + 446, wy + 14], PAL.brass, 2.5, 0.4, 43);
    inkEllipse(g, x + 418, wy + 8, 6, 6, PAL.brass, 2.5, 44);
    if (t.whistle) for (let k = 0; k < 3; k++) inkCurve(g, x + 452, wy + 2 + k * 6, x + 458 + k * 2, wy - 2 + k * 6, x + 464, wy + 2 + k * 6, 2, INK, k);
    plainText(g, 'piščalka', x + 436, y + 58, 11, INK, 'center');
    tag(g, x + 436, y + 74, 'B');
    plainText(g, t.dir > 0 ? 'NAPREJ ▶' : '◀ NAZAJ', x + 436, y + 106, 11, t.dir > 0 ? INK : PAL.red, 'center');
    tag(g, x + 436, y + 124, 'Y', 'smer');
  }
  function sackIcon(g, x, y, s, seed) {
    inkPoly(g, [x - s, y + s * 0.8, x - s * 0.8, y - s * 0.4, x - s * 0.3, y - s * 0.9, x + s * 0.3, y - s * 0.9, x + s * 0.8, y - s * 0.4, x + s, y + s * 0.8], '#d8b878', 2, 0.4, seed);
  }
  function drawP2(g, G) {
    const t = G.train;
    const x = W - 488, y = H - 172;
    card(g, x, y, 476, 162, PAL.cream, 12);
    const shov = t.shovelAnim > 0;
    drawToon(g, x + 428, y + 150, { shirt: PAL.teal, pants: '#6b4a2f', hat: 'bandana', hatCol: PAL.red, sc: 1.1, face: -1, seed: 9, soot: true, carry: shov, mood: t.P < 6 ? 'sad' : 'happy' });
    if (shov) { inkLine(g, [x + 420, y + 84, x + 398, y + 44], 4, PAL.woodDark, 0.3); inkPoly(g, [x + 388, y + 34, x + 408, y + 38, x + 402, y + 52, x + 384, y + 48], '#777', 2.5, 0.4, 5); }
    plainText(g, 'KURJAČ', x + 428, y + 16, 13, PAL.teal2, 'center');
    dial(g, x + 66, y + 80, 52, t.P, 0, 16, t.P.toFixed(0) + ' bar', [[0, 6, '#e58a74'], [6, 10, '#f1d27a'], [10, TRAIN.valveP, '#9cc58a'], [TRAIN.valveP, 16, '#e58a74']], 22);
    plainText(g, 'TLAK', x + 66, y + 146, 12, INK, 'center');
    // vodokazno steklo + injektor
    const lvl = clamp(t.boilerWater / TRAIN.boilerWaterCap, 0, 1), gx = x + 140, gt = y + 22, gh = 92;
    inkPoly(g, [gx - 11, gt, gx + 11, gt, gx + 11, gt + gh, gx - 11, gt + gh], PAL.white, 3, 0.4, 61);
    g.fillStyle = lvl < 0.2 || lvl > 0.92 ? '#e58a74' : PAL.water; g.fillRect(gx - 8, gt + gh - 3 - (gh - 6) * lvl, 16, (gh - 6) * lvl);
    for (const q of [0.3, 0.9]) inkLine(g, [gx - 16, gt + gh - 3 - (gh - 6) * q, gx - 11, gt + gh - 3 - (gh - 6) * q], 2.5, PAL.red2, 0.2);
    plainText(g, t.inj > 0.02 ? (t.P > 3 ? 'INJEKTOR' : 'NI TLAKA') : 'VODA', gx, y + 124, 11, t.inj > 0.02 && t.P <= 3 ? PAL.red : INK, 'center');
    tag(g, gx, y + 142, 'RT');
    // ogenj + lopata
    const fx = x + 206, heat = clamp(t.burn / 12, 0, 1), fs = 10 + heat * 22;
    inkEllipse(g, fx, y + 80, 28, 24, '#3a302a', 3, 62);
    const fl = Math.sin(BEAT * Math.PI * 4) * 2;
    inkPoly(g, [fx - fs * 0.6, y + 94, fx - fs * 0.3, y + 94 - fs * 0.8, fx, y + 94 - fs - fl, fx + fs * 0.3, y + 94 - fs * 0.7, fx + fs * 0.6, y + 94], t.combEff < 0.8 ? '#a0603a' : '#f0902a', 2.5, 0.8, 63);
    inkPoly(g, [fx - fs * 0.3, y + 94, fx, y + 94 - fs * 0.6, fx + fs * 0.3, y + 94], PAL.yellow, 0, 0.6, 64);
    plainText(g, `OGENJ ${Math.round(t.grate)} kg`, fx, y + 30, 11, INK, 'center');
    plainText(g, 'lopata', fx, y + 124, 11, INK, 'center');
    tag(g, fx, y + 142, 'A');
    // loputa
    const dx = x + 262, dw = 70, dy = y + 40;
    plainText(g, 'LOPUTA', dx + dw / 2, y + 22, 11, INK, 'center');
    inkPoly(g, [dx, dy - 5, dx + dw, dy - 5, dx + dw, dy + 5, dx, dy + 5], '#3a302a', 2, 0.3, 65);
    inkEllipse(g, dx + dw * (t.damper - 0.2) / 1.3, dy, 8, 8, '#7ab', 2.5, 66);
    tag(g, dx + dw + 20, dy, 'L↔');
    // zaloge v tendru
    const ty = y + 66;
    plainText(g, 'TENDER', dx + 40, ty, 11, INK, 'center');
    const carts = t.coal / 500;
    for (let k = 0; k < 10; k++) {
      const fill = clamp(carts - k, 0, 1), bx = dx + 2 + (k % 5) * 15, by = ty + 10 + Math.floor(k / 5) * 14;
      inkPoly(g, [bx, by, bx + 12, by, bx + 12, by + 11, bx, by + 11], fill > 0 ? PAL.coal : '#e2d4b0', 1.5, 0.3, 70 + k);
      if (fill > 0 && fill < 1) { g.fillStyle = '#e2d4b0'; g.fillRect(bx + 1, by + 1, 10, 10 * (1 - fill)); }
    }
    plainText(g, `${(t.coal / 1000).toFixed(1)} t`, dx + 100, ty + 23, 12, t.coal < COAL_LOW ? PAL.red : INK, 'center');
    inkPoly(g, [dx, ty + 44, dx + 74, ty + 44, dx + 74, ty + 58, dx, ty + 58], PAL.white, 2, 0.3, 80);
    g.fillStyle = PAL.water; g.fillRect(dx + 2, ty + 46, 70 * clamp(t.water / TRAIN.waterCap, 0, 1), 10);
    plainText(g, `${t.water.toFixed(1)} m³`, dx + 104, ty + 51, 12, t.water < 3 ? PAL.red : INK, 'center');
    const sk = Math.ceil(t.sand / 50);
    for (let k = 0; k < Math.min(8, sk); k++) sackIcon(g, dx + 6 + k * 9, ty + 76, 6, 90 + k);
  }
  function drawTop(g, G) {
    const t = G.train, tr = G.track;
    const next = G.leg + 1;
    const d = tr.stops[next] * SEG - t.pos;
    const arr = G.sched.arr[next], slack = arr - G.clock;
    // trak z imenom postaje
    const cx = W / 2;
    inkPoly(g, [cx - 300, 14, cx + 300, 14, cx + 280, 40, cx + 300, 66, cx - 300, 66, cx - 280, 40], PAL.red, 3.5, 0.8, 101);
    toonText(g, `→ ${STATIONS[next].name}`, cx, 32, 24, PAL.cream, 'center', FONT_T);
    plainText(g, d > 0 ? `še ${(d / 1000).toFixed(1)} km` : 'prevozili!', cx, 55, 14, PAL.cream, 'center');
    // ura
    inkEllipse(g, W - 66, 52, 44, 44, PAL.brass, 3.5, 102);
    inkEllipse(g, W - 66, 52, 37, 37, PAL.white, 2.5, 103);
    const tm = G.clock;
    const ah = (tm / 3600) % 12 / 12 * Math.PI * 2 - Math.PI / 2, am = (tm / 60) % 60 / 60 * Math.PI * 2 - Math.PI / 2;
    inkLine(g, [W - 66, 52, W - 66 + Math.cos(ah) * 18, 52 + Math.sin(ah) * 18], 4, INK, 0.3);
    inkLine(g, [W - 66, 52, W - 66 + Math.cos(am) * 28, 52 + Math.sin(am) * 28], 3, INK, 0.3);
    card(g, W - 230, 18, 118, 70, slack >= 0 ? '#d9ecc4' : '#f3c2b2', 104, 10);
    plainText(g, fmtTime(G.clock).slice(0, 5), W - 171, 36, 18, INK, 'center');
    plainText(g, slack >= 0 ? 'PRAVOČASNO' : 'ZAMUJAMO!', W - 171, 56, 12, slack >= 0 ? '#2d6a2d' : PAL.red2, 'center');
    plainText(g, (slack >= 0 ? '+' : '−') + fmtDelta(Math.abs(slack)).slice(1), W - 171, 74, 13, INK, 'center');
    // točke
    inkPoly(g, star(70, 52, 40, 18), PAL.yellow, 3.5, 0.8, 105);
    toonText(g, String(G.score.points), 70, 54, 20, PAL.white);
    // profil proge
    const leg = tr.legs[G.leg];
    const px = cx - 260, pw = 520, py = 76, ph = 46;
    card(g, px - 8, py, pw + 16, ph + 12, '#efe0bb', 106, 8);
    const prof = leg.profile, mn = Math.min(...prof) - 4, mx = Math.max(...prof) + 4;
    g.beginPath(); g.moveTo(px, py + ph + 6);
    prof.forEach((v, i) => g.lineTo(px + i / (prof.length - 1) * pw, py + ph + 4 - (v - mn) / (mx - mn) * (ph - 8)));
    g.lineTo(px + pw, py + ph + 6); g.closePath();
    g.fillStyle = leg.rain ? '#9aa36a' : PAL.grass; g.fill(); stroke(g, 2.5);
    const f = clamp((t.pos - tr.stops[G.leg] * SEG) / leg.len, 0, 1);
    const ty = py + ph + 4 - (heightAt(tr, t.pos) - mn) / (mx - mn) * (ph - 8);
    inkEllipse(g, px + f * pw, ty - 6, 8, 6, PAL.red, 2.5, 107);
    inkLine(g, [px + pw, py + ph + 4, px + pw, py + 12], 2.5, INK, 0.3);
    inkPoly(g, [px + pw, py + 12, px + pw + 14, py + 17, px + pw, py + 22], STATIONS[next].color, 2, 0.3, 108);
    // ovce in skladišče
    const sheep = (G.challenges || []).find(c => c.state === 'idle' && c.pos - t.pos < 420 && c.pos - t.pos > -10);
    if (sheep) {
      card(g, cx - 200, 142, 400, 42, '#f3c2b2', 110, 10);
      const lx = legend(g, cx - 175, 163, [], `Ovce na progi čez ${Math.round(sheep.pos - t.pos)} m!  Zatrobi`, 17);
      btnGlyph(g, lx + 18, 163, 'B', 11);
      return;
    }
    const ea = Events.alert(G);
    if (ea) {
      g.font = `bold 17px ${FONT}`;
      const w = g.measureText(ea.text).width + 50;
      card(g, cx - w / 2, 142, w, 42, ea.col, 113, 10);
      plainText(g, ea.text, cx, 163, 17, INK, 'center');
      return;
    }
    const kids = (G.kids || []).find(c => !c.happy && c.pos - t.pos < 220 && c.pos - t.pos > -40);
    if (kids) {
      card(g, cx - 190, 142, 380, 42, '#d9ecc4', 112, 10);
      const lx = legend(g, cx - 165, 163, [], 'Otroci mahajo! Pozdravi jih', 17);
      btnGlyph(g, lx + 18, 163, 'B', 11);
      return;
    }
    if (G.depot && !G.depot.used) {
      const dd = G.depot.pos - t.pos;
      if (dd > -30 && dd < 700) {
        const ok = Math.abs(dd) < 25;
        card(g, cx - 210, 142, 420, 42, ok ? '#d9ecc4' : '#fff0b8', 111, 10);
        plainText(g, ok ? (Math.abs(t.v) < 0.05 ? (t.reg >= 0.05 ? 'ZAPRI PARO – skladišče!' : 'Skladišče!') : 'USTAVI pri skladišču!') : `Skladišče premoga čez ${Math.round(dd)} m – ustavi pri H`, cx, 163, 17, INK, 'center');
        return;
      }
    }
    // približevanje
    if (Math.abs(d) < 500) {
      const ok = Math.abs(d) < 25;
      const msg = ok ? (Math.abs(t.v) < 0.05 ? (t.reg >= 0.05 ? 'ZAPRI PARO!' : 'USTAVLJENO!') : 'USTAVI ZDAJ!') : d > 0 ? `do oznake H: ${Math.round(d)} m` : `prevozili ${Math.round(-d)} m – nazaj (Y)`;
      card(g, cx - 160, 142, 320, 40, ok ? '#d9ecc4' : PAL.cream, 109, 10);
      plainText(g, msg, cx, 162, 18, ok ? '#2d6a2d' : INK, 'center');
    }
  }
  function star(x, y, R, r) { const p = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R; p.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } return p; }
  function messages(g, G, y0 = 200) {
    let y = y0;
    for (const m of G.msgs) {
      const a = Math.min(1, m.t * 2);
      const sc = m.t > m.dur - 0.15 ? 1 + (m.t - (m.dur - 0.15)) * 3 : 1;
      g.save(); g.globalAlpha = a; g.translate(W / 2, y); g.scale(sc, sc);
      g.font = `bold 22px ${FONT}`;
      const w = g.measureText(m.text).width + 50;
      inkPoly(g, [-w / 2, -20, w / 2, -20, w / 2 - 14, 0, w / 2, 20, -w / 2, 20, -w / 2 + 14, 0], m.color, 3, 0.6, Math.floor(m.dur * 10));
      plainText(g, m.text, 0, 1, 20, INK, 'center');
      g.restore();
      y += 50;
    }
  }
  return { drawP1, drawP2, drawTop, messages, star, dial };
})();
