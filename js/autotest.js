'use strict';
// Razvojni avtopilot za preverjanje celotnega poteka igre: index.html#auto (ali #auto-short za premalo zalog).
// Simulira pritiske gumbov obeh igralcev in pospeši igro.
window.addEventListener('error', e => console.log('NAPAKA: ' + e.message + ' @' + e.filename + ':' + e.lineno));
window.addEventListener('unhandledrejection', e => console.log('NAPAKA (promise): ' + e.reason));
setInterval(() => console.log("AUTO t=" + G.time.toFixed(2) + " mode=" + G.mode + " ev=" + (G.ev ? G.ev.t.toFixed(2) : "-")), 1000);
setTimeout(() => { const T = G.track, runs = []; let a = -1; T.segs.forEach((q, i) => { if (q.tunnel && a < 0) a = i; if (!q.tunnel && a >= 0) { runs.push([a * SEG, i * SEG]); a = -1; } }); console.log("AUTO predori " + JSON.stringify(runs) + " prehodi " + JSON.stringify(T.crossings.map(c => c * SEG)) + " gore " + T.mountains.length); Snd.init(); console.log("AUTO zvok"); }, 2500);
function steer(p, from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy);
  if (d < 14) return true;
  p.lx = dx / d; p.ly = -dy / d; return false;
}
window.AUTO = {
  // igra postajo prek pravih kontrol (palica + gumbi)
  station(G, p1, p2) {
    const st = G.st, t = G.train, D = Station.dbg, k = st.k;
    this.stLog = this.stLog || {};
    const tap = (i, p, b) => { this.tA[i] = !this.tA[i]; p[b] = this.tA[i]; };
    // P1
    const av = st.av;
    const cl = D.cars(t).filter(c => c.wagon);
    let target = null, act = null;
    const tk = Object.keys(D.TASKS).find(k => st.tasks[k] < 1);
    if (av.ready) {}
    else if (av.carry) {
      if (av.carry.dest === k) { target = { x: av.x, y: 520 }; act = 'a'; }
      else { const c = cl.find(c => c.wagon.type === 'F' && D.free(c.wagon) >= 0); target = c ? D.doorOf(c) : { x: av.x, y: 520 }; act = 'a'; }
    } else if (av.followers.length) {
      const c = cl.find(c => c.wagon.type === 'P' && D.free(c.wagon) >= 0);
      if (c) { target = D.doorOf(c); act = 'a'; }
    } else {
      const c = cl.find(c => c.wagon.slots.some(it => it && it.dest === k));
      const w = st.ents.filter(e => e.state === 'wait' && e.dest !== k && cl.some(c => c.wagon.type === e.kind && D.free(c.wagon) >= 0));
      if (c) { target = D.doorOf(c); act = 'a'; }
      else if (w.length) { w.sort((a, b) => Math.hypot(a.x - av.x, a.y - av.y) - Math.hypot(b.x - av.x, b.y - av.y)); target = w[0]; act = 'a'; }
      else if (tk) { if (steer(p1, av, D.TASKS[tk])) p1.a = true; }
      else { tap(0, p1, 'y'); }
    }
    if (target && steer(p1, av, target) && act) tap(0, p1, act);
    // P2
    const fl = st.fl;
    if (st.last || fl.ready) return;
    if (location.hash.includes('lazy')) { tap(1, p2, 'y'); return; }
    const n = Station.needs(G.track.legs[k]);
    const S = D.SPOT;
    const tip = { x: fl.x + Math.cos(fl.ang) * 30, y: fl.y + Math.sin(fl.ang) * 30 };
    const go = (spot) => steer(p2, tip, spot);
    if (fl.load === 'coal') { if (go(S.tender)) tap(1, p2, 'a'); }
    else if (fl.load === 'sand') { if (go(S.dome)) tap(1, p2, 'a'); }
    else if (t.coal + 1 < n.carts * D.COAL_LOAD) { if (go(S.coal)) tap(1, p2, 'a'); }
    else if (t.water < Math.min(TRAIN.waterCap, n.water)) { if (go(S.tower)) p2.a = true; }
    else if (t.sand + 1 < n.sacks * D.SAND_LOAD) { if (go(S.sandbin)) tap(1, p2, 'a'); }
    else tap(1, p2, 'y');
  },
  // vmesne igre
  event(G, p1, p2) {
    const e = G.ev; if (!e) return;
    const tap = (i, p, b) => { this.tA[i] = !this.tA[i]; p[b] = this.tA[i]; };
    const walk = (p, a, x) => { const d = x - a.x; p.lx = Math.abs(d) < 12 ? 0 : Math.sign(d); return Math.abs(d) < 14; };
    if (e.kind === 'saw') { p1.lx = e.need; p2.lx = e.need; return; }
    if (e.kind !== 'dragon' || e.won) return;
    const [a1, a2] = e.av;
    if (e.weapon === 'coal') {
      if (e.coalHits < 2) tap(0, p1, 'a');
      else if (walk(p1, a1, e.labX)) tap(0, p1, 'y');
      return;
    }
    if (e.weapon === 'catapult' && e.catHits >= 2) { if (walk(p1, a1, e.labX)) tap(0, p1, 'y'); return; }
    const atW1 = walk(p1, a1, e.weaponX + 25), atW2 = walk(p2, a2, e.weaponX - 25);
    if (atW2 && !e.loaded && e.loadT <= 0) tap(1, p2, 'a');
    if (!atW1 || !e.loaded) return;
    // poišči kot, pri katerem tir izstrelka zadene zmaja
    const d = e.d, s = Math.sign(d.x - e.weaponX) || 1;
    const sp = e.weapon === 'ballista' ? 1300 : 920, g = e.weapon === 'ballista' ? 180 : 900;
    let best = 1e9, bestA = e.aim;
    for (let a = 0.15; a <= 1.35; a += 0.02) {
      let x = e.weaponX, y = e.roofY - 40, vx = Math.cos(a) * sp * s, vy = -Math.sin(a) * sp, tt = 0;
      for (let k = 0; k < 120; k++) { vy += g * 0.01; x += vx * 0.01; y += vy * 0.01; tt += 0.01;
        const dd = Math.hypot(x - (d.x + d.vx * tt), y - (d.y - 10 + d.vy * tt)); if (dd < best) { best = dd; bestA = a; } }
    }
    e.aim = bestA;
    if (best < 30) tap(0, p1, 'a');
  },
  real: location.hash.includes('real'), stopAt: +(location.hash.match(/stop([\d.]+)/) || [0, 0])[1], tA: [false, false],
  speed: +(location.hash.match(/x(\d+)/) || [0, 40])[1], toggle: false, lastMode: '', short: location.hash.includes('short'),
  control(G, dt) {
    const p1 = Ctl.p[0], p2 = Ctl.p[1], t = G.train;
    this.toggle = !this.toggle;
    if (G.mode !== this.lastMode) {
      console.log(`AUTO ${fmtTime(G.clock)} način=${G.mode} postaja/odsek=${G.st ? G.st.k : G.leg} točke=${G.score.points} vagoni=${t.wagons.length} ${G.reason || ''}`);
      this.lastMode = G.mode;
    }
    if (G.quiz) {
      const q = G.quiz;
      if (q.solvedT <= 0) { q.digits = String(q.answer).padStart(q.nd, '0').split('').map(Number); p1.a = this.toggle; }
      if (!this.quizLog) { this.quizLog = 1; console.log(`AUTO račun (${q.purpose}): ${q.text} = ${q.answer}`); }
      return;
    }
    this.quizLog = 0;
    if (G.mode === 'title' || G.mode === 'over' || G.mode === 'end') {
      if (G.mode === 'title') { p1.a = this.toggle; p2.a = this.toggle; }
      return;
    }
    if (Events.modes.includes(G.mode)) { this.event(G, p1, p2); return; }
    if (G.mode === 'station') {
      if (this.real) { this.station(G, p1, p2); return; }
      if (!G.st.av.ready && !G.trans) Station.autoSolve(G, this.short);
      return;
    }
    // vožnja
    const tr = G.track;
    const stopZ = tr.stops[G.leg + 1] * SEG;
    let target = 99;
    const i0 = Math.floor(t.pos / SEG);
    for (let i = i0; i < Math.min(tr.segs.length, i0 + 300); i++) {
      const d = Math.max(0, i * SEG - t.pos - 20);
      target = Math.min(target, Math.sqrt((tr.segs[i].limit / 3.6 - 1) ** 2 + 2 * 0.45 * d));
    }
    target = Math.min(target, Math.sqrt(2 * 0.4 * Math.max(0, stopZ - t.pos - 2)));
    if (G.log.state === 'idle' && G.log.pos > t.pos) target = Math.min(target, Math.sqrt(2 * 0.4 * Math.max(0, G.log.pos - t.pos - 40)));
    if (G.depot && !G.depot.used) target = Math.min(target, Math.sqrt(2 * 0.4 * Math.max(0, G.depot.pos - t.pos - 2)));
    const atDepot = G.depot && !G.depot.used && G.depot.pos - t.pos < 30;
    p1.ly = 0; p1.lt = 0;
    if (t.v < target - 0.4) p1.ly = 1;
    else if (t.v > target + 0.2) { p1.ly = -1; p1.lt = clamp((t.v - target) * 0.6, 0, 1); }
    if (stopZ - t.pos < 30 || atDepot || (G.log.state === 'idle' && G.log.pos - t.pos < 45)) { p1.ly = -1; p1.lt = 1; }
    p1.a = t.slipping;
    p1.b = G.challenges.some(c => c.state === 'idle' && c.pos - t.pos < 200 && c.pos - t.pos > 0) || G.kids.some(c => !c.happy && Math.abs(c.pos - t.pos) < 80);
    p2.a = this.toggle && t.grate < 40 + 220 * t.reg && t.P < 14.8;
    if (G.mini) {
      if (G.mini.solvedT <= 0) G.mini.digits = String(G.mini.answer).padStart(G.mini.nd, '0').split('').map(Number);
      p2.a = this.toggle;
      if (!this.miniLog) { this.miniLog = 1; console.log(`AUTO kurjačev račun: ${G.mini.text} = ${G.mini.answer}`); }
    } else this.miniLog = 0;
    const lvl = t.boilerWater / TRAIN.boilerWaterCap;
    this.inj = lvl < 0.6 ? 1 : lvl > 0.8 ? 0 : (this.inj || 0);
    p2.rt = this.inj;
  },
};
