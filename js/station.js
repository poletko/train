'use strict';
// Postanek kot prizor: P1 (lik) prelaga potnike in zaboje na peronu, P2 (viličar) naloži premog, vodo in pesek.
const Station = (() => {
  const SC = 11;                  // px/m za vlak na postaji
  const TRACK_Y = 330;
  const FRONT_X = 1240;
  const PLAT = { x0: 30, x1: 1250, y0: 392, y1: 590 };
  const YARD = { x0: 450, x1: 1262, y0: 118, y1: 286 };
  const SPOT = {
    coal: { x: 640, y: 200, label: 'kup premoga' },
    tender: { x: 1040, y: 284, label: 'tender' },
    tower: { x: 1160, y: 232, label: 'vodni stolp' },
    sandbin: { x: 1232, y: 196, label: 'pesek' },
    dome: { x: 1170, y: 284, label: 'peščenik' },
  };
  const GATE = { x: 640, y: 700 };
  // opravila strojevodje na lokomotivi (drži A)
  const TASKS = {
    oil: { x: FRONT_X - 6.5 * SC + 14, y: 396, label: 'naolji kolesa', done: 'Kolesa naoljena!' },
    whistle: { x: FRONT_X - 11.2 * SC, y: 396, label: 'očisti piščalko', done: 'Piščalka čista!' },
  };
  const COAL_LOAD = 500, SAND_LOAD = 50, WATER_RATE = 0.6, DRAIN_RATE = 1.2;

  const carX = (off) => FRONT_X - off * SC;
  function cars(t) { return World.carList(t).map(c => ({ ...c, x: carX(c.off) })); }
  function doorOf(c) { return { x: c.x, y: TRACK_Y + 50 }; }

  // ---------- pravila za kurjača (poenostavljeno za otroke) ----------
  function needs(leg) {
    const carts = Math.ceil(leg.len / 1000 / 2 + leg.climb / 30 + 2 + (leg.rain ? 1 : 0));
    return { carts, water: carts * 2 + 2, sacks: Math.ceil(1 + leg.len / 1000 / (leg.rain ? 2 : 4)) };
  }

  function genWaiting(k, t) {
    const last = STATIONS.length - 1, out = [];
    if (k >= last) return out;
    const pickDest = () => { const r = Math.random(); return Math.min(last, k + 1 + Math.floor(r * r * (last - k))); };
    const hasP = t.wagons.some(w => w.type === 'P'), hasF = t.wagons.some(w => w.type === 'F');
    const nP = hasP ? 3 + Math.floor(Math.random() * 5) : 0, nF = hasF ? 1 + Math.floor(Math.random() * 4) : 0;
    const shirts = [PAL.mustard, PAL.blue, '#b06ea8', PAL.leaf, '#d98a4a', PAL.teal];
    const spot = () => ({ x: 340 + Math.random() * 600, y: 450 + Math.random() * 120 });
    for (let i = 0; i < nP; i++) out.push({ kind: 'P', dest: pickDest(), ...spot(), state: 'wait', shirt: shirts[i % shirts.length], seed: Math.random() * 100, phase: 0, hat: Math.random() < 0.5 ? 'bowler' : 'flower' });
    for (let i = 0; i < nF; i++) out.push({ kind: 'F', dest: pickDest(), ...spot(), state: 'wait' });
    return out;
  }

  function enter(G, k) {
    const t = G.train;
    t.reg = 0; t.brake = 1; t.v = 0; t.inj = 0; t.sanding = false;
    const last = k === STATIONS.length - 1;
    G.st = {
      k, last, ents: genWaiting(k, t), pops: [],
      av: { x: 300, y: 450, face: 1, phase: 0, moving: false, carry: null, followers: [], ready: false, work: null },
      tasks: { oil: 0, whistle: 0 },
      fl: { x: 860, y: 240, ang: Math.PI, load: null, anim: 0, ready: last, pour: false, drain: false, phase: 0 },
      delivered: 0, pts: 0, hint: [null, null],
    };
  }

  const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r;
  function say(G, i, txt) { G.st.hint[i] = { txt, t: 1.8 }; }
  function pop(G, x, y, txt, col = PAL.yellow) { G.st.pops.push({ x, y, txt, col, t: 1.2 }); }

  function counts(G) {
    const st = G.st, t = G.train;
    let unload = 0, load = 0;
    t.wagons.forEach(w => w.slots.forEach(it => { if (it && it.dest === st.k) unload++; }));
    if (st.av.carry && st.av.carry.dest === st.k) unload++;
    for (const e of st.ents) if (e.dest !== st.k && (e.state === 'wait' || e.state === 'follow')) load++;
    if (st.av.carry && st.av.carry.dest !== st.k) load++;
    return { unload, load };
  }

  function free(w) { return w.slots.indexOf(null); }

  // ---------- P1: lik na peronu ----------
  function updateAvatar(G, dt) {
    const st = G.st, av = st.av, t = G.train, p = Ctl.p[0];
    let dx = p.lx + (p.right ? 1 : 0) - (p.left ? 1 : 0), dy = -p.ly + (p.down ? 1 : 0) - (p.up ? 1 : 0);
    const m = Math.hypot(dx, dy);
    if (av.ready) { dx = dy = 0; }
    av.moving = m > 0.15 && !av.ready;
    if (av.moving) {
      const sp = (av.carry ? 170 : 240) * Math.min(1, m) / Math.max(1, m);
      av.x = clamp(av.x + dx * sp * dt, PLAT.x0, PLAT.x1); av.y = clamp(av.y + dy * sp * dt, PLAT.y0, PLAT.y1);
      av.phase += dt * 12; if (Math.abs(dx) > 0.2) av.face = Math.sign(dx);
    }
    // sledilci
    let lead = av;
    for (const f of av.followers) {
      const d = Math.hypot(lead.x - f.x, lead.y - f.y);
      f.moving = d > 30;
      if (f.moving) { const k = (d - 28) / d; f.x += (lead.x - f.x) * Math.min(1, k * dt * 8); f.y += (lead.y - f.y) * Math.min(1, k * dt * 8); f.phase += dt * 12; f.face = Math.sign(lead.x - f.x) || 1; }
      lead = f;
    }
    // opravila: drži A pri kolesih / kabini
    av.work = null;
    if (!av.ready && !av.carry && !av.followers.length) {
      const tk = Object.keys(TASKS).find(k => st.tasks[k] < 1 && near(av, TASKS[k], 46));
      if (tk && p.a) {
        av.work = tk; av.face = 1;
        st.tasks[tk] = Math.min(1, st.tasks[tk] + dt / 2.2);
        if (st.tasks[tk] >= 1) { G.addPoints(5); Snd.good(); pop(G, TASKS[tk].x, TASKS[tk].y - 90, TASKS[tk].done); }
        return;
      }
    }
    // B: spusti zaboj ali pusti potnike
    if (Ctl.pressed(0, 'b') && !av.ready) {
      if (av.followers.length) { for (const f of av.followers) { f.state = 'wait'; f.moving = false; } av.followers = []; say(G, 0, 'Potniki počakajo tukaj.'); Snd.click(); return; }
    }
    if (!Ctl.pressed(0, 'a') || av.ready) return;
    const cl = cars(t);
    const door = cl.filter(c => c.wagon).find(c => near(av, doorOf(c), 55));
    if (av.carry) {
      if (door) {
        if (door.wagon.type !== 'F') { say(G, 0, 'Zaboji gredo v tovorni vagon!'); Snd.bad(); return; }
        const s = free(door.wagon);
        if (s < 0) { say(G, 0, 'Vagon je poln! Odloži zaboj na peron.'); Snd.bad(); return; }
        door.wagon.slots[s] = { kind: 'F', dest: av.carry.dest };
        av.carry = null; Snd.shovel(); pop(G, door.x, TRACK_Y, 'Naloženo!');
        return;
      }
      const c = av.carry; av.carry = null;
      if (c.dest === st.k) { st.delivered++; G.score.delivered++; G.addPoints(20); Snd.good(); pop(G, av.x, av.y - 80, '+20'); }
      else st.ents.push({ kind: 'F', dest: c.dest, x: av.x + av.face * 22, y: av.y + 4, state: 'wait' });
      Snd.shovel();
      return;
    }
    if (door) {
      const w = door.wagon;
      if (av.followers.length) {
        if (w.type !== 'P') { say(G, 0, 'Potniki gredo v potniški vagon! (B = naj počakajo)'); Snd.bad(); return; }
        let boarded = 0;
        for (const f of av.followers.slice()) {
          const s = free(w);
          if (s < 0) { say(G, 0, 'Vagon je poln!'); break; }
          w.slots[s] = { kind: 'P', dest: f.dest, shirt: f.shirt, hat: f.hat };
          f.state = 'board'; f.tx = door.x; f.ty = TRACK_Y + 30;
          av.followers.splice(av.followers.indexOf(f), 1); boarded++;
        }
        if (boarded) { Snd.good(); pop(G, door.x, TRACK_Y, 'Vstopite!'); }
        return;
      }
      if (w.type === 'P') {
        let n = 0;
        w.slots.forEach((it, i) => {
          if (it && it.dest === st.k) {
            w.slots[i] = null; n++;
            st.ents.push({ kind: 'P', dest: it.dest, x: door.x + (n - 2) * 14, y: TRACK_Y + 45, state: 'leave', shirt: it.shirt || PAL.mustard, hat: it.hat || 'bowler', seed: Math.random() * 100, phase: 0, delay: n * 0.25 });
          }
        });
        if (n) { st.delivered += n; G.score.delivered += n; G.addPoints(10 * n); Snd.good(); pop(G, door.x, TRACK_Y, `+${10 * n}`); }
        else { say(G, 0, 'Tukaj nihče ne izstopi.'); Snd.click(); }
      } else {
        const i = w.slots.findIndex(it => it && it.dest === st.k);
        if (i < 0) { say(G, 0, 'Tu ni zabojev za to postajo.'); Snd.click(); return; }
        av.carry = w.slots[i]; w.slots[i] = null; Snd.shovel();
      }
      return;
    }
    // poberi najbližji zaboj ali povabi potnika
    let best = null, bd = 50;
    for (const e of st.ents) {
      if (e.state !== 'wait') continue;
      const d = Math.hypot(e.x - av.x, e.y - av.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) {
      if (av.followers.length) { for (const f of av.followers) { f.state = 'wait'; f.moving = false; } av.followers = []; say(G, 0, 'Potniki počakajo tukaj.'); }
      Snd.click(); return;
    }
    const space = t.wagons.some(w => w.type === best.kind && free(w) >= 0);
    if (best.kind === 'F' && !space) { say(G, 0, 'V tovornih vagonih ni več prostora.'); Snd.bad(); return; }
    if (best.kind === 'P' && t.wagons.filter(w => w.type === 'P').reduce((n, w) => n + w.slots.filter(x => !x).length, 0) <= av.followers.length) { say(G, 0, 'V potniških vagonih ni več prostora.'); Snd.bad(); return; }
    if (best.kind === 'F') { av.carry = { kind: 'F', dest: best.dest }; st.ents.splice(st.ents.indexOf(best), 1); Snd.shovel(); }
    else if (av.followers.length >= 4) { say(G, 0, 'Največ 4 potniki naenkrat!'); Snd.bad(); }
    else { best.state = 'follow'; av.followers.push(best); Snd.click(); pop(G, best.x, best.y - 70, 'Za tabo!', PAL.white); }
  }

  // ---------- P2: viličar ----------
  function updateForklift(G, dt) {
    const st = G.st, fl = st.fl, t = G.train, p = Ctl.p[1];
    if (st.last) return;
    const dx = p.lx + (p.right ? 1 : 0) - (p.left ? 1 : 0), dy = -p.ly + (p.down ? 1 : 0) - (p.up ? 1 : 0);
    const m = Math.min(1, Math.hypot(dx, dy));
    fl.anim = Math.max(0, fl.anim - dt);
    if (m > 0.15 && !fl.ready && fl.anim <= 0) {
      const target = Math.atan2(dy, dx);
      let diff = Math.atan2(Math.sin(target - fl.ang), Math.cos(target - fl.ang));
      fl.ang += clamp(diff, -7 * dt, 7 * dt);
      const sp = 260 * m * Math.max(0, Math.cos(diff));
      fl.x = clamp(fl.x + Math.cos(fl.ang) * sp * dt, YARD.x0, YARD.x1); fl.y = clamp(fl.y + Math.sin(fl.ang) * sp * dt, YARD.y0, YARD.y1);
      fl.phase += sp * dt * 0.05;
    }
    const tip = { x: fl.x + Math.cos(fl.ang) * 30, y: fl.y + Math.sin(fl.ang) * 30 };
    let at = null, bd = 60;
    for (const k in SPOT) { const d = Math.min(Math.hypot(tip.x - SPOT[k].x, tip.y - SPOT[k].y), Math.hypot(fl.x - SPOT[k].x, fl.y - SPOT[k].y) + 15); if (d < bd) { bd = d; at = k; } }
    fl.at = at;
    // voda: drži A (natoči) ali B (izpusti) pri stolpu
    fl.pour = at === 'tower' && p.a && !fl.ready && t.water < TRAIN.waterCap;
    fl.drain = at === 'tower' && p.b && !fl.ready && t.water > 0;
    if (fl.pour) t.water = Math.min(TRAIN.waterCap, t.water + WATER_RATE * dt);
    if (fl.drain) t.water = Math.max(0, t.water - DRAIN_RATE * dt);
    if (!Ctl.pressed(1, 'a') || fl.ready || fl.anim > 0) return;
    if (at === 'coal' && !fl.load) { fl.load = 'coal'; fl.anim = 0.5; Snd.shovel(); }
    else if (at === 'sandbin' && !fl.load) { fl.load = 'sand'; fl.anim = 0.4; Snd.shovel(); }
    else if (at === 'tender') {
      if (fl.load === 'coal') {
        if (t.coal + COAL_LOAD > TRAIN.coalCap + 1) { say(G, 1, 'Tender je poln!'); Snd.bad(); return; }
        t.coal += COAL_LOAD; fl.load = null; fl.anim = 0.5; Snd.clank(); pop(G, SPOT.tender.x, 250, '+1 voz');
      } else if (!fl.load && t.coal >= COAL_LOAD) { t.coal -= COAL_LOAD; fl.load = 'coal'; fl.anim = 0.5; Snd.shovel(); pop(G, SPOT.tender.x, 250, '−1 voz', PAL.white); }
      else if (fl.load === 'sand') { say(G, 1, 'Pesek gre v peščenik na lokomotivi!'); Snd.bad(); }
    } else if (at === 'dome') {
      if (fl.load === 'sand') {
        if (t.sand + SAND_LOAD > TRAIN.sandCap + 1) { say(G, 1, 'Peščenik je poln!'); Snd.bad(); return; }
        t.sand += SAND_LOAD; fl.load = null; fl.anim = 0.4; Snd.good(); pop(G, SPOT.dome.x, 250, '+1 vreča');
      } else if (!fl.load && t.sand >= SAND_LOAD) { t.sand -= SAND_LOAD; fl.load = 'sand'; fl.anim = 0.4; pop(G, SPOT.dome.x, 250, '−1 vreča', PAL.white); }
      else if (fl.load === 'coal') { say(G, 1, 'Premog gre v tender!'); Snd.bad(); }
    } else if (at === 'coal' && fl.load === 'coal') { fl.load = null; fl.anim = 0.4; Snd.shovel(); }
    else if (at === 'sandbin' && fl.load === 'sand') { fl.load = null; fl.anim = 0.4; }
    else if (at === 'tower') say(G, 1, 'Drži A za vodo, B za izpust.');
    else Snd.click();
  }

  function updateEnts(G, dt) {
    const st = G.st;
    for (let i = st.ents.length - 1; i >= 0; i--) {
      const e = st.ents[i];
      if (e.state === 'board') {
        const d = Math.hypot(e.tx - e.x, e.ty - e.y);
        e.moving = true; e.phase += dt * 12;
        if (d < 8) { st.ents.splice(i, 1); continue; }
        e.x += (e.tx - e.x) / d * 200 * dt; e.y += (e.ty - e.y) / d * 200 * dt; e.face = Math.sign(e.tx - e.x) || 1;
      } else if (e.state === 'leave') {
        if ((e.delay -= dt) > 0) continue;
        const d = Math.hypot(GATE.x - e.x, GATE.y - e.y);
        e.moving = true; e.phase += dt * 12; e.face = Math.sign(GATE.x - e.x) || 1;
        if (d < 10) { st.ents.splice(i, 1); continue; }
        e.x += (GATE.x - e.x) / d * 150 * dt; e.y += (GATE.y - e.y) / d * 150 * dt;
      }
    }
    for (const p of st.pops) { p.t -= dt; p.y -= 30 * dt; }
    st.pops = st.pops.filter(p => p.t > 0);
    for (const h of st.hint) if (h) h.t -= dt;
  }

  function update(G, dt) {
    const st = G.st;
    updateAvatar(G, dt);
    updateForklift(G, dt);
    updateEnts(G, dt);
    if (Ctl.pressed(0, 'y')) {
      if (st.av.carry || st.av.followers.length) { say(G, 0, 'Najprej odloži zaboj / pelji potnike! (B = naj počakajo)'); Snd.bad(); }
      else if (!st.av.ready && (st.tasks.oil < 1 || st.tasks.whistle < 1)) { say(G, 0, 'Najprej naolji kolesa in očisti piščalko!'); Snd.bad(); }
      else { st.av.ready = !st.av.ready; st.av.ready ? Snd.good() : Snd.click(); }
    }
    if (Ctl.pressed(1, 'y') && !st.last) {
      if (st.fl.load) { say(G, 1, 'Najprej odloži tovor z viličarja!'); Snd.bad(); }
      else { st.fl.ready = !st.fl.ready; st.fl.ready ? Snd.good() : Snd.click(); }
    }
    if (st.av.ready && st.fl.ready && !st.ents.some(e => e.state === 'board' || e.state === 'leave')) depart(G);
  }

  function depart(G) {
    const st = G.st, t = G.train, k = st.k;
    if (st.departing) return;
    st.departing = true;
    let missed = 0, left = 0, pts = 0;
    t.wagons.forEach(w => w.slots.forEach((it, i) => { if (it && it.dest === k) { missed++; pts -= 15; w.slots[i] = null; } }));
    for (const e of st.ents) if (e.dest !== k) { left++; pts -= 5; }
    G.score.missed += missed; G.score.left += left;
    G.addPoints(pts);
    G.depart(k, { delivered: st.delivered, missed, left, pts: pts + st.delivered * 10 });
  }

  // samodejna rešitev (za razvojni avtopilot)
  function autoSolve(G, short) {
    const st = G.st, t = G.train;
    t.wagons.forEach(w => w.slots.forEach((it, i) => { if (it && it.dest === st.k) { w.slots[i] = null; st.delivered++; G.score.delivered++; G.addPoints(it.kind === 'F' ? 20 : 10); } }));
    for (const e of st.ents.slice()) {
      if (e.state !== 'wait') continue;
      const w = t.wagons.find(w => w.type === e.kind && free(w) >= 0);
      if (w) { w.slots[free(w)] = { kind: e.kind, dest: e.dest }; st.ents.splice(st.ents.indexOf(e), 1); }
    }
    if (!st.last) {
      const n = needs(G.track.legs[st.k]);
      t.coal = Math.min(TRAIN.coalCap, Math.max(t.coal, n.carts * COAL_LOAD * (short ? 0.35 : 1)));
      t.water = Math.min(TRAIN.waterCap, Math.max(t.water, n.water * (short ? 0.35 : 1)));
      t.sand = Math.min(TRAIN.sandCap, Math.max(t.sand, n.sacks * SAND_LOAD));
    }
    st.tasks.oil = st.tasks.whistle = 1; st.av.ready = true; st.fl.ready = true; st.fl.load = null;
  }

  // ---------------- izris ----------------
  function drawYard(g) {
    g.fillStyle = '#cfb27c'; g.fillRect(0, 0, W, 300);
    for (let i = 0; i < 60; i++) { const x = (i * 211) % W, y = (i * 97) % 290; g.fillStyle = 'rgba(120,90,50,0.15)'; g.beginPath(); g.ellipse(x, y, 30, 10, 0, 0, 7); g.fill(); }
    // peron
    g.fillStyle = '#e8d8b2'; g.fillRect(0, 365, W, H - 365);
    g.strokeStyle = 'rgba(29,22,17,0.18)'; g.lineWidth = 1.5;
    for (let y = 400; y < H; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 34 % 2) * 30; x < W; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 34); g.stroke(); } }
    inkLine(g, [0, 368, W, 368], 4); g.fillStyle = PAL.yellow; g.fillRect(0, 371, W, 8); inkLine(g, [0, 380, W, 380], 2);
    // proga
    g.fillStyle = PAL.ballast; g.fillRect(0, 296, W, 70); inkLine(g, [0, 296, W, 296], 3);
    g.fillStyle = PAL.sleeper; for (let x = 6; x < W; x += 22) g.fillRect(x, 304, 10, 54);
    for (const y of [314, 346]) { inkLine(g, [0, y, W, y], 5); inkLine(g, [0, y, W, y], 2, '#d8d0c0', 0.2); }
    // ograja spodaj z vrati
    for (let x = 20; x < W; x += 46) if (Math.abs(x - GATE.x) > 60) inkPoly(g, [x - 4, 708, x - 4, 668, x, 662, x + 4, 668, x + 4, 708], PAL.white, 2, 0.4, x);
    inkLine(g, [0, 680, GATE.x - 60, 680], 4, PAL.white, 0.5); inkLine(g, [GATE.x + 60, 680, W, 680], 4, PAL.white, 0.5);
    toonText(g, 'IZHOD', GATE.x, 690, 16, PAL.cream);
  }
  function drawBuilding(g, G) {
    const st = G.st;
    inkPoly(g, [12, 292, 12, 96, 432, 96, 432, 292], PAL.yellow, 4, 0.8, 1);
    inkPoly(g, [0, 104, 40, 22, 404, 22, 444, 104], PAL.roof, 4, 0.9, 2);
    for (let k = 1; k < 4; k++) inkLine(g, [8 + k * 10, 104 - k * 20, 436 - k * 10, 104 - k * 20], 1.5, 'rgba(29,22,17,0.4)', 0.6);
    toonText(g, STATIONS[st.k].name.toUpperCase(), 222, 62, STATIONS[st.k].name.length > 14 ? 20 : 26, PAL.cream, 'center', FONT_T);
    // tabla
    const bx = 30, by = 110, bw = 384, bh = 172;
    inkPoly(g, [bx - 8, by - 8, bx + bw + 8, by - 8, bx + bw + 8, by + bh + 8, bx - 8, by + bh + 8], PAL.wood, 3.5, 0.6, 3);
    g.fillStyle = '#2f4a3a'; g.fillRect(bx, by, bw, bh);
    const chalk = (txt, x, y, s = 15, c = '#f2efe4') => { g.font = `bold ${s}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = c; g.fillText(txt, x + jit(x + y, 0.4), y + jit(y, 0.4)); };
    if (st.last) { chalk('Končna postaja!', bx + 14, by + 30, 22); chalk('Razloži vse potnike in zaboje.', bx + 14, by + 64); chalk('Kurjač si je zaslužil počitek. :)', bx + 14, by + 92); return; }
    const leg = G.track.legs[st.k];
    chalk(`Naslednja: ${STATIONS[st.k + 1].name}`, bx + 12, by + 18, 17, '#f7e27b');
    chalk(`Proga ${(leg.len / 1000).toFixed(1)} km · hribi ${Math.round(leg.climb)} m${leg.rain ? ' · DEŽ ☂' : ''}`, bx + 12, by + 42, 15);
    chalk('PREMOG: ½ voza na km + 1 voz na 30 m', bx + 12, by + 70, 14);
    chalk(`              hribov + 2 voza rezerve${leg.rain ? ' + 1 (dež)' : ''}`, bx + 12, by + 88, 14);
    chalk('VODA: 2 m³ za vsak voz premoga + 2 m³', bx + 12, by + 112, 14);
    chalk(`PESEK: 1 vreča + 1 vreča na ${leg.rain ? '2' : '4'} km`, bx + 12, by + 136, 14);
    chalk('Zaokroži navzgor!  Preveč = počasi, premalo = kazenski račun!', bx + 12, by + 160, 11, '#f2b6a6');
  }
  function drawTower(g, G) {
    const x = 1160, y = 222, fl = G.st.fl;
    shadow(g, x, y + 4, 46, 10);
    for (const s of [-1, 1]) inkLine(g, [x + s * 36, y, x + s * 26, y - 70], 6, PAL.woodDark, 0.4);
    inkLine(g, [x - 32, y - 30, x + 32, y - 30], 3, PAL.woodDark, 0.4);
    cylinder(g, x, y - 70, 44, 54, PAL.teal, PAL.teal2, 5);
    for (const yy of [y - 90, y - 108]) inkLine(g, [x - 44, yy, x + 44, yy], 2.5, INK, 0.4);
    inkPoly(g, [x - 52, y - 122, x, y - 160, x + 52, y - 122], PAL.roof, 3.5, 0.6, 6);
    // cev do tenderja
    const swing = fl.pour || fl.drain ? 1 : 0.2;
    const ex = lerp(x - 30, 1060, swing), ey = lerp(y - 70, 262, swing);
    inkLine(g, [x - 30, y - 82, ex, ey], 9, INK, 0.4); inkLine(g, [x - 30, y - 82, ex, ey], 4, '#5f6f6a', 0.4);
    if (fl.pour) {
      for (let k = 0; k < 3; k++) inkLine(g, [ex + jit(k, 3), ey, ex + jit(k + 4, 4), 292], 6 - k * 1.5, k ? PAL.water2 : PAL.water, 0.5, k);
      for (let k = 0; k < 5; k++) { const a = BEAT * 6 + k * 1.3; inkEllipse(g, ex + Math.cos(a) * 14, 292 - Math.abs(Math.sin(a)) * 12, 3, 4, PAL.water2, 1.2, k); }
    }
    if (fl.drain) for (let k = 0; k < 4; k++) inkEllipse(g, 1060 + jit(k, 20), 300 + (BEAT * 40 + k * 10) % 30, 4, 3, PAL.water2, 1.2, k);
    plainText(g, 'VODA', x, y - 82, 13, PAL.cream, 'center');
  }
  function drawSandbin(g) {
    const x = 1232, y = 214;
    shadow(g, x, y + 4, 28, 8);
    inkPoly(g, [x - 26, y, x - 22, y - 46, x + 22, y - 46, x + 26, y], PAL.wood, 3, 0.5, 1);
    inkEllipse(g, x, y - 46, 22, 8, PAL.mustard, 3, 2);
    toonText(g, 'PESEK', x, y - 20, 11, PAL.cream);
  }
  function drawCoal(g) {
    const x = SPOT.coal.x, y = SPOT.coal.y + 20;
    shadow(g, x, y, 90, 16);
    blobs(g, [[x - 60, y - 14, 26], [x - 22, y - 34, 36], [x + 26, y - 30, 34], [x + 64, y - 12, 24], [x, y - 10, 30]], PAL.coal, 3, 1);
    g.fillStyle = 'rgba(255,255,255,0.28)'; for (const [a, b] of [[-30, -50], [20, -48], [-62, -26], [52, -24], [0, -22]]) { g.beginPath(); g.arc(x + a, y + b, 4, 0, 7); g.fill(); }
    toonText(g, 'PREMOG', x, y + 18, 13, PAL.cream);
  }
  function drawForklift(g, G) {
    const fl = G.st.fl, a = fl.ang, c = Math.cos(a), s = Math.sin(a);
    g.save(); g.translate(fl.x, fl.y); g.scale(1.4, 1.4);
    const x = 0, y = 0;
    shadow(g, x, y + 6, 34, 18);
    const lift = fl.load ? 16 : 4 + (fl.anim > 0 ? Math.sin(fl.anim * 12) * 6 : 0);
    // vilice in drog spredaj
    const fx = x + c * 26, fy = y + s * 26;
    for (const n of [-7, 7]) inkLine(g, [fx - s * n, fy + c * n - lift, fx + c * 24 - s * n, fy + s * 24 + c * n - lift], 4, '#444', 0.3);
    if (fl.load === 'coal') blobs(g, [[fx + c * 12 - 5, fy + s * 12 - lift - 8, 10], [fx + c * 12 + 6, fy + s * 12 - lift - 6, 9], [fx + c * 14, fy + s * 14 - lift - 16, 8]], PAL.coal, 2.5, 3);
    if (fl.load === 'sand') { g.save(); g.translate(fx + c * 12, fy + s * 12 - lift - 8); inkPoly(g, [-12, 10, -10, -6, -4, -12, 4, -12, 10, -6, 12, 10], '#d8b878', 2.5, 0.4, 4); g.restore(); }
    const body = box(g, x, y, a, 46, 32, 18, PAL.mustard, '#c48a2c', '#c48a2c', 7, 4);
    for (const n of [-1, 1]) inkLine(g, [fx - s * n * 12, fy + c * n * 12 - 4, fx - s * n * 12, fy + c * n * 12 - 44], 4, INK, 0.3);
    inkLine(g, [fx - s * 12, fy + c * 12 - 44, fx + s * 12, fy - c * 12 - 44], 4, INK, 0.3);
    // voznik (kurjač)
    const top = Math.min(...body.t.map(p => p[1]));
    g.save(); g.beginPath(); g.rect(x - 60, y - 140, 120, top - (y - 140) + 14); g.clip();
    drawToon(g, x - c * 6, y + 18, { shirt: PAL.teal, pants: '#6b4a2f', hat: 'bandana', hatCol: PAL.red, sc: 0.75, face: c >= 0 ? 1 : -1, seed: 9, soot: true, mood: fl.ready ? 'happy' : 'happy' });
    g.restore();
    // žarometa kot oči
    for (const n of [-0.5, 0.5]) pieEye(g, x + c * 22 - s * n * 22, y + s * 22 + c * n * 22 - 14, 4, c, s, false, 11 + n);
    g.restore();
  }
  function drawEnt(g, e) {
    if (e.kind === 'P') {
      drawToon(g, e.x, e.y, { shirt: e.shirt, pants: '#5a4a3a', hat: e.hat, hatCol: STATIONS[e.dest].color, sc: 0.8, face: e.face || 1, phase: e.phase, moving: e.moving, seed: e.seed, wave: e.state === 'leave' });
      if (e.state !== 'leave') { inkEllipse(g, e.x + 16, e.y - 78, 12, 9, STATIONS[e.dest].color, 2, e.seed); plainText(g, STATIONS[e.dest].code, e.x + 16, e.y - 77, 10, INK, 'center'); }
    } else {
      shadow(g, e.x, e.y + 2, 18, 5);
      crateIcon(g, e.x, e.y - 14, 15, e.dest, e.x);
    }
  }

  function draw(g, G) {
    const st = G.st, t = G.train;
    drawYard(g);
    drawBuilding(g, G);
    const list = [];
    list.push({ y: SPOT.coal.y + 20, f: () => drawCoal(g) });
    list.push({ y: 222, f: () => drawTower(g, G) });
    list.push({ y: 214, f: () => drawSandbin(g) });
    if (!st.last) list.push({ y: st.fl.y + 10, f: () => drawForklift(g, G) });
    // vlak
    const here = st.k;
    for (const c of cars(t)) {
      const glow = c.wagon && (c.wagon.slots.some(it => it && it.dest === here));
      list.push({ y: TRACK_Y + 20, f: () => drawCar(g, c.type, c.x, TRACK_Y, 0, SC, { dist: 0, mood: 'happy', blink: hsh(Math.floor(BEAT * 2)) < 0.07, coal: t.coal, water: t.water, showLevels: true, sandLevel: t.sand / TRAIN.sandCap, slots: c.wagon ? c.wagon.slots : null, doorGlow: glow && Math.floor(BEAT * 2) % 2 }) });
    }
    for (const e of st.ents) list.push({ y: e.y, f: () => drawEnt(g, e) });
    const av = st.av;
    list.push({ y: av.y, f: () => {
      drawToon(g, av.x, av.y, { shirt: PAL.red, pants: PAL.navy, hat: 'cap', hatCol: PAL.blue, face: av.face, phase: av.phase, moving: av.moving, carry: !!av.carry, seed: 3, wave: av.ready });
      if (av.carry) crateIcon(g, av.x, av.y - 104, 15, av.carry.dest, 7);
    } });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();
    // namigi ob vratih in mestih
    const cl = cars(t);
    const door = cl.filter(c => c.wagon).find(c => near(av, doorOf(c), 55));
    if (door && !av.ready) { inkEllipse(g, door.x, TRACK_Y + 50, 26, 9, null, 3, 5); btnGlyph(g, door.x, TRACK_Y + 50, 'A', 11); }
    if (st.fl.at && !st.fl.ready && !st.last) {
      const sp = SPOT[st.fl.at]; inkEllipse(g, sp.x, sp.y, 30, 11, null, 3, 6);
      if (st.fl.at === 'tower') { const lx = legend(g, sp.x - 70, sp.y + 22, ['A'], 'voda', 13); legend(g, lx + 6, sp.y + 22, ['B'], 'izpust', 13); }
      else btnGlyph(g, sp.x, sp.y, 'A', 11);
    }
    for (const k in TASKS) {
      const tk = TASKS[k], v = st.tasks[k];
      if (v >= 1) { inkEllipse(g, tk.x, tk.y - 2, 13, 13, '#9cc58a', 2.5, 7); inkLine(g, [tk.x - 6, tk.y - 2, tk.x - 1, tk.y + 3, tk.x + 7, tk.y - 7], 3, INK, 0.3); continue; }
      inkEllipse(g, tk.x, tk.y, 24, 9, null, 3, 8);
      if (k === 'oil') { inkPoly(g, [tk.x - 7, tk.y - 4, tk.x + 7, tk.y - 4, tk.x + 5, tk.y - 18, tk.x - 5, tk.y - 18], PAL.red, 2, 0.3, 9); inkLine(g, [tk.x + 5, tk.y - 16, tk.x + 16, tk.y - 26], 2.5, INK, 0.3); }
      else { inkPoly(g, [tk.x - 8, tk.y - 10, tk.x + 8, tk.y - 14, tk.x + 8, tk.y - 6], PAL.brass, 2, 0.3, 10); inkEllipse(g, tk.x - 10, tk.y - 10, 4, 4, PAL.brass, 2, 11); }
      if (v > 0) { g.beginPath(); g.arc(tk.x, tk.y - 40, 14, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2); stroke(g, 5, PAL.yellow); }
      if (near(av, tk, 46) && !av.ready) { const lx = legend(g, tk.x - 60, tk.y + 26, ['A'], 'drži: ' + tk.label, 12); void lx; }
    }
    if (av.work) {
      const hx = av.x + 26, hy = av.y - 32;
      if (av.work === 'oil') {
        inkPoly(g, [hx - 7, hy, hx + 7, hy, hx + 5, hy - 14, hx - 5, hy - 14], PAL.red, 2, 0.3, 12);
        inkLine(g, [hx + 5, hy - 12, hx + 18, hy - 4], 2.5, INK, 0.3);
        for (let k = 0; k < 3; k++) inkEllipse(g, hx + 18, hy + ((BEAT * 30 + k * 8) % 24), 2, 3, '#3a2a14', 1, k);
      } else {
        const bx = hx + Math.sin(BEAT * 12) * 6;
        inkLine(g, [bx, hy, bx + 10, hy - 16], 3, PAL.woodDark, 0.3);
        inkPoly(g, [bx + 6, hy - 18, bx + 16, hy - 22, bx + 18, hy - 14, bx + 8, hy - 10], PAL.yellow, 2, 0.3, 13);
        for (let k = 0; k < 3; k++) inkEllipse(g, bx + 14 + k * 6, hy - 26 - ((BEAT * 20 + k * 7) % 20), 3, 3, PAL.white, 1.2, k);
      }
    }
    for (const p of st.pops) { g.globalAlpha = Math.min(1, p.t * 2); toonText(g, p.txt, p.x, p.y, 22, p.col); g.globalAlpha = 1; }
    st.hint.forEach((h, i) => { if (h && h.t > 0) { const who = i ? st.fl : av; World.bubble(g, who.x + 40, who.y - (i ? 80 : 120), h.txt, 17); } });
    if (av.ready) World.bubble(g, av.x + 40, av.y - 120, 'Pripravljen!', 17);
    // kaj še zadržuje odhod
    const wait = [];
    if (!av.ready) wait.push('strojevodjo (Y)');
    if (!st.fl.ready && !st.last) wait.push('kurjača (Y)');
    if (st.ents.some(e => e.state === 'board' || e.state === 'leave')) wait.push('potnike');
    if (wait.length && (av.ready || st.fl.ready)) { card(g, W / 2 - 220, 56, 440, 34, '#f3c2b2', 205, 8); const lx = legend(g, W / 2 - 205, 73, [], 'Čakamo ' + wait.join(', ').replace(/ \(Y\)/g, '') + ' – pritisni', 15); btnGlyph(g, lx + 18, 73, 'Y', 10); }
    if (st.fl.ready && !st.last) World.bubble(g, st.fl.x + 40, st.fl.y - 80, 'Pripravljen!', 17);
    drawCards(g, G);
  }

  function drawCards(g, G) {
    const st = G.st, t = G.train;
    // zgoraj: ura in odhod
    const dep = G.sched.dep[st.k];
    card(g, W / 2 - 170, 6, 340, 44, PAL.cream, 201, 10);
    plainText(g, st.last ? `Ura ${fmtTime(G.clock).slice(0, 5)} · končna postaja` : `Ura ${fmtTime(G.clock).slice(0, 5)} · odhod ${fmtTime(dep).slice(0, 5)} ${G.clock <= dep ? '' : '(zamuda!)'}`, W / 2, 28, 17, G.clock <= dep ? INK : PAL.red2, 'center');
    inkPoly(g, HUD.star(W / 2 + 210, 28, 26, 12), PAL.yellow, 3, 0.6, 202);
    toonText(g, String(G.score.points), W / 2 + 210, 29, 15, PAL.white);
    // P1
    const { unload, load } = counts(G);
    card(g, 12, 600, 300, 108, PAL.cream, 203, 12);
    plainText(g, 'STROJEVODJA – peron', 26, 620, 14, PAL.red2);
    plainText(g, `Za razložiti: ${unload}`, 26, 645, 17, unload ? PAL.red2 : '#2d6a2d');
    plainText(g, `Za naložiti: ${load}`, 26, 668, 17, load ? PAL.red2 : '#2d6a2d');
    plainText(g, `${st.tasks.oil >= 1 ? '✔' : '○'} kolesa`, 190, 645, 15, st.tasks.oil >= 1 ? '#2d6a2d' : PAL.red2);
    plainText(g, `${st.tasks.whistle >= 1 ? '✔' : '○'} piščalka`, 190, 668, 15, st.tasks.whistle >= 1 ? '#2d6a2d' : PAL.red2);
    let lx = legend(g, 20, 690, ['A'], 'primi/odloži', 12); lx = legend(g, lx + 6, 690, ['B'], 'pusti', 12); legend(g, lx + 6, 690, ['Y'], 'pripravljen', 12);
    // P2
    if (st.last) return;
    card(g, W - 312, 600, 300, 108, PAL.cream, 204, 12);
    plainText(g, 'KURJAČ – viličar', W - 298, 620, 14, PAL.teal2);
    plainText(g, `Tender: ${(t.coal / COAL_LOAD).toFixed(1).replace('.0', '')} voza · ${t.water.toFixed(1)} m³`, W - 298, 645, 16);
    plainText(g, `Peščenik: ${Math.round(t.sand / SAND_LOAD)} vreč · masa ${(trainMass(t) / 1000).toFixed(0)} t`, W - 298, 668, 16);
    let rx = legend(g, W - 306, 690, ['L↕'], 'vozi', 12); rx = legend(g, rx + 6, 690, ['A'], 'naloži', 12); legend(g, rx + 6, 690, ['Y'], 'pripravljen', 12);
  }

  return { enter, update, draw, autoSolve, needs, dbg: { SPOT, TASKS, cars, doorOf, free, COAL_LOAD, SAND_LOAD } };
})();
