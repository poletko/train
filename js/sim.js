'use strict';
// Fizika vlaka in parnega kotla (brez DOM, da se lahko poganja tudi v nodu).

function makeWagon(type) { return { type, slots: new Array(SLOTS).fill(null) }; }

function makeTrain() {
  return {
    pos: 0, v: 0, dir: 1,
    reg: 0, brake: 0, sanding: false, whistle: false,
    damper: 1.0, inj: 0,
    grate: 100, boilerE: 30, boilerWater: 4.2,
    coal: 0, water: 0, sand: 0,
    wagons: [makeWagon('P'), makeWagon('P'), makeWagon('F'), makeWagon('F')],
    shovelCd: 0, shovelAnim: 0,
    slipping: false, slipTime: 0, priming: false, crownHeat: 0,
    P: 12, burn: 0, combEff: 1, valve: 0, draw: 0, F: 0,
    used: { coal: 0, water: 0, sand: 0 },
    chuffPhase: 0, clackDist: 0,
  };
}

function wagonMass(w) {
  let m = WAGON_TYPES[w.type].mass;
  for (const it of w.slots) if (it) m += ITEM_MASS[it.kind];
  return m;
}
function trainMass(t, coal = t.coal, water = t.water, sand = t.sand) {
  let m = TRAIN.locoMass + TRAIN.tenderEmpty + coal + water * 1000 + sand;
  for (const w of t.wagons) m += wagonMass(w);
  return m;
}

function shovel(t) {
  if (t.shovelCd > 0 || t.coal <= 0) return false;
  const a = Math.min(TRAIN.shovelKg, t.coal);
  t.coal -= a; t.grate += a; t.used.coal += a;
  t.shovelCd = TRAIN.shovelCd; t.shovelAnim = 0.3;
  return true;
}

function simStep(t, track, dt) {
  const ev = [];
  const T = TRAIN;
  const seg = segAt(track, t.pos);
  const grade = gradeAt(track, t.pos);
  const M = trainMass(t);
  const P = t.boilerE / T.boilerCapMJ * T.maxP;
  t.P = P;
  const level = t.boilerWater / T.boilerWaterCap;
  t.shovelCd = Math.max(0, t.shovelCd - dt);
  t.shovelAnim = Math.max(0, t.shovelAnim - dt);

  // --- kurišče ---
  let burn = Math.min(t.grate * 0.045 * t.damper, t.grate / dt);
  t.grate = Math.max(0, t.grate - burn * dt);
  const combEff = clamp(1 - 0.25 * Math.max(0, t.damper - 1) - Math.max(0, (t.grate - 350) / 400), 0.35, 1);
  t.burn = burn; t.combEff = combEff;
  const heatIn = burn * T.heatPerKg * combEff;               // MW

  // --- vleka ---
  const pf = clamp((P - 2) / 11, 0, 1);
  const av = Math.abs(t.v);
  const Fmax = Math.min(T.F0, T.Pmax / Math.max(av, 0.5));
  t.priming = level > 0.92;
  const Fdem = t.reg * pf * Fmax * (t.priming ? 0.5 : 1);
  const wet = seg.rain && !seg.tunnel;
  let mu = wet ? 0.13 : 0.24;
  if (t.sanding && t.sand > 0) {
    mu += 0.1;
    const s = Math.min(t.sand, T.sandRate * dt);
    t.sand -= s; t.used.sand += s;
  }
  const adh = mu * T.adhesiveMass * G_ACC;
  const slipping = Fdem > adh && Fdem > 1000;
  if (slipping && !t.slipping) ev.push('slip');
  t.slipping = slipping;
  t.slipTime = slipping ? t.slipTime + dt : 0;
  const F = slipping ? adh * 0.55 : Fdem;
  t.F = F;
  const wheelV = slipping ? av + 6 : av;
  const draw = Fdem * Math.max(wheelV, 1.5) / 1e6;           // MW pare
  t.draw = draw;

  // --- injektor ---
  let inj = 0;
  if (t.inj > 0.02 && P > 3 && t.water > 0) {
    inj = Math.min(t.inj * T.injRate * dt, t.water);
    t.water -= inj; t.boilerWater += inj; t.used.water += inj;
  }
  t.injActive = inj > 0;
  // --- varnostni ventil ---
  const vent = P > T.valveP ? (P - T.valveP) * 4 : 0;
  if (vent > 0 && t.valve === 0) ev.push('valve');
  t.valve = vent;
  const loss = 0.015 + 0.03 * P / T.maxP;
  const dE = (level > 0.02 ? heatIn : heatIn * 0.2) - draw - vent - loss - inj / dt * T.injCool;
  t.boilerE = clamp(t.boilerE + dE * dt, 0, T.boilerCapMJ * 1.05);
  const evap = (draw + vent) * T.evapPerMJ * dt * (t.priming ? 1.5 : 1);
  t.boilerWater = clamp(t.boilerWater - evap, 0, T.boilerWaterCap);

  // pregrevanje stropa kurišča
  if (level < 0.06 && heatIn > 0.2) t.crownHeat += dt;
  else t.crownHeat = Math.max(0, t.crownHeat - dt * 0.5);
  if (t.crownHeat > 8) ev.push('explode');

  // --- gibanje ---
  const traction = t.dir * F;
  const gravity = -M * G_ACC * grade;
  const fric = M * G_ACC * 0.002 + 6 * t.v * t.v + t.brake * T.brakeMu * M * G_ACC;
  const drive = traction + gravity;
  const Me = M * 1.06;
  if (Math.abs(t.v) < 0.02) {
    if (Math.abs(drive) <= fric) t.v = 0;
    else t.v += (drive - Math.sign(drive) * fric) / Me * dt;
  } else {
    const nv = t.v + (drive - Math.sign(t.v) * fric) / Me * dt;
    t.v = Math.sign(nv) !== Math.sign(t.v) ? 0 : nv;
  }
  t.pos += t.v * dt;
  if (t.pos < 5) { t.pos = 5; t.v = Math.max(0, t.v); }
  if (t.pos > track.len - 10) { t.pos = track.len - 10; t.v = Math.min(0, t.v); }

  // zvoki
  if (t.reg > 0.02 && pf > 0 && (av > 0.05 || slipping)) {
    const prev = t.chuffPhase;
    t.chuffPhase += Math.max(wheelV, 0.6) * dt * 0.8;
    if (Math.floor(prev) !== Math.floor(t.chuffPhase)) ev.push('chuff');
  }
  t.clackDist += av * dt;
  if (t.clackDist > 25) { t.clackDist -= 25; ev.push('clack'); }

  // --- zaloge pošle ---
  if (t.coal <= 0 && t.grate < 25) ev.push('out:coal');
  if (t.water <= 0.01 && level < 0.3) ev.push('out:water');
  if (t.sand <= 0 && slipping && av < 1 && t.slipTime > 4) ev.push('out:sand');
  return ev;
}
