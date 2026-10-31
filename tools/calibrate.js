// Umerjanje: avtopilot prevozi vse odseke in izpiše porabo + čas.
// Zagon: node tools/calibrate.js [polnost 0..1]
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = ['config.js', 'track.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '../js', f), 'utf8')).join('\n');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(src + '\nthis.api={buildTrack,makeTrain,simStep,shovel,trainMass,segAt,nextLimit,TRAIN,SEG,LEGS};', ctx);
const A = ctx.api;
const fill = parseFloat(process.argv[2] || '0.5');

const track = A.buildTrack();
const dt = 1 / 60;
for (let L = 0; L < A.LEGS.length; L++) {
  const t = A.makeTrain();
  for (const w of t.wagons) for (let s = 0; s < 6 * fill; s++) w.slots[s] = { kind: w.type, dest: 5 };
  t.coal = 4000; t.water = 16; t.sand = 300;
  t.boilerE = 32; t.boilerWater = 4.2; t.grate = 100;
  t.pos = track.stops[L] * A.SEG;
  const stopZ = track.stops[L + 1] * A.SEG;
  const M = A.trainMass(t) / 1000;
  let eDraw = 0, eVent = 0, eHeat = 0, time = 0, maxP = 0, minP = 99, minLvl = 1, slipT = 0, viol = 0;
  while (time < 3000) {
    // strojevodja
    let target = 99;
    const i0 = Math.floor(t.pos / A.SEG);
    for (let i = i0; i < Math.min(track.segs.length, i0 + 300); i++) {
      const d = Math.max(0, i * A.SEG - t.pos - 20);
      target = Math.min(target, Math.sqrt((track.segs[i].limit / 3.6 - 1) ** 2 + 2 * 0.45 * d));
    }
    target = Math.min(target, Math.sqrt(2 * 0.4 * Math.max(0, stopZ - t.pos - 2)));
    if (t.v < target - 0.4) { t.reg = Math.min(1, t.reg + dt * 0.6); t.brake = 0; }
    else if (t.v > target + 0.2) { t.reg = Math.max(0, t.reg - dt * 2); t.brake = Math.min(1, (t.v - target) * 0.6); }
    else t.brake = 0;
    t.sanding = t.slipping;
    // kurjač
    if (t.grate < 40 + 220 * t.reg && t.P < 14.8) A.shovel(t);
    const lvl = t.boilerWater / A.TRAIN.boilerWaterCap;
    t.inj = lvl < 0.6 ? 1 : lvl > 0.8 ? 0 : t.inj;
    const ev = A.simStep(t, track, dt);
    if (ev.includes('explode')) { console.log('EXPLODE'); break; }
    const seg = A.segAt(track, t.pos);
    if (t.v * 3.6 > seg.limit + 5) viol++;
    maxP = Math.max(maxP, t.P); minP = Math.min(minP, t.P); minLvl = Math.min(minLvl, lvl);
    if (t.slipping) slipT += dt;
    eDraw += t.draw * dt; eVent += t.valve * dt; eHeat += t.burn * t.combEff * 0.12 * dt;
    time += dt;
    if (Math.abs(t.v) < 0.05 && Math.abs(stopZ - t.pos) < 25 && time > 20) break;
  }
  const li = track.legs[L];
  const Lkm = li.len / 1000, Hm = li.climb;
  const fCoal = M * (0.2 * Lkm + 0.1 * Hm + 2) + 150;
  console.log(`odsek ${L}: L=${Lkm.toFixed(1)}km H=${Hm.toFixed(0)}m M=${M.toFixed(0)}t | čas ${time.toFixed(0)}s (vozni red ${li.sched}s) | premog ${t.used.coal.toFixed(0)}kg (formula ${fCoal.toFixed(0)}) voda ${t.used.water.toFixed(1)}m3 pesek ${t.used.sand.toFixed(0)}kg | P ${minP.toFixed(1)}-${maxP.toFixed(1)} minLvl ${minLvl.toFixed(2)} zdrs ${slipT.toFixed(0)}s prekršek ${viol > 0} | E para ${eDraw.toFixed(0)} ventil ${eVent.toFixed(0)} ogenj ${eHeat.toFixed(0)} MJ`);
}
