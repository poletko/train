'use strict';
// Proga: segmenti (višina, krivina, omejitve, predori, postaje), tloris (x, y, smer) in okrasje pokrajine.

function newSeg(y, limit, rain, leg) {
  return { y, curve: 0, R: 0, limit, zone: 0, rain, tunnel: false, platform: false, leg, x: 0, z: 0, ang: 0 };
}

function buildTrack() {
  const segs = [];
  const stops = [];      // indeks segmenta, kjer mora stati lokomotiva
  const legInfo = [];
  const signs = [];
  const PRE = 240;
  for (let i = 0; i < Math.round(PRE / SEG); i++) segs.push(newSeg(0, 40, false, 0));
  stops.push(segs.length);

  let elev = 0, heading = 0;
  for (let L = 0; L < LEGS.length; L++) {
    const lg = LEGS[L];
    const rnd = mulberry32(lg.seed);
    const n = Math.round(lg.len / SEG);
    const start = segs.length;
    const e0 = elev, e1 = lg.e1;
    for (let j = 0; j < n; j++) {
      const d = j * SEG;
      const tt = clamp((d - 250) / (lg.len - 500), 0, 1);
      const sm = tt * tt * (3 - 2 * tt);
      const y = e0 + (e1 - e0) * sm + lg.hump * Math.sin(Math.PI * tt)
        + 2 * Math.sin(tt * 9 + lg.seed) * Math.sin(Math.PI * tt);
      const s = newSeg(y, lg.line, lg.rain, L);
      s.tunnel = lg.tunnels.some(([ta, tb]) => tt >= ta && tt <= tb);
      if (s.tunnel) s.limit = Math.min(s.limit, 60);
      segs.push(s);
    }
    // krivine (smer ostaja približno proti vzhodu, da se proga ne zavozla)
    let d = 300;
    while (d < lg.len - 350) {
      d += 150 + rnd() * 450;
      const Rs = [170, 220, 300, 420, 650];
      const R = Rs[Math.floor(rnd() * Rs.length)];
      const clen = Math.min(150 + rnd() * 400, R * 0.9);
      if (d + clen > lg.len - 300) break;
      const sgn = heading > 0.45 ? -1 : heading < -0.45 ? 1 : (rnd() < 0.5 ? -1 : 1);
      heading += sgn * clen / R;
      const a = start + Math.round(d / SEG), b = start + Math.round((d + clen) / SEG);
      const ramp = Math.round(30 / SEG);
      const lim = Math.min(lg.line, Math.floor(Math.sqrt(R) * 3.6 / 5) * 5);
      for (let k = a; k < b; k++) {
        const e = Math.min(1, (k - a + 1) / ramp, (b - k) / ramp);
        segs[k].curve = sgn * SEG * SEG / R * e;
        segs[k].R = R;
        segs[k].limit = Math.min(segs[k].limit, lim);
      }
      d += clen;
    }
    elev = e1;
    stops.push(segs.length);
  }
  for (let i = 0; i < Math.round(400 / SEG); i++) segs.push(newSeg(elev, 40, LEGS[LEGS.length - 1].rain, LEGS.length - 1));

  // mostovi čez potoke (lesen most: omejitev 50 km/h, pri bistveno previsoki hitrosti se podre)
  const bridges = [];
  const addBridge = (i) => {
    bridges.push(i);
    for (let k = i - 3; k <= i + 3; k++) segs[k].bridge = true;
    for (let k = i - 8; k <= i + 5; k++) segs[k].limit = Math.min(segs[k].limit, BRIDGE_LIMIT);
  };
  // prost kos proge (brez predora, mostu, perona) v okolici ±r segmentov
  const freeAt = (i, r) => { for (let k = i - r; k <= i + r; k++) { const q = segs[k]; if (!q || q.tunnel || q.bridge || q.crossing) return false; } return !stops.some(st => Math.abs(st - i) < 90); };
  const place = (L, fracs, r, fn, max = 9) => {
    let n = 0;
    for (const f of fracs) { if (n >= max) break; const i = Math.round(lerp(stops[L], stops[L + 1], f)); if (freeAt(i, r)) { fn(i); n++; } }
  };
  place(0, [0.55, 0.45, 0.65], 25, addBridge, 1);
  place(3, [0.45, 0.5, 0.4], 25, addBridge, 1);
  place(3, [0.85, 0.8, 0.9, 0.75], 25, addBridge, 1);
  // cestni prehodi (dva na odsek)
  const crossings = [];
  for (let L = 0; L < LEGS.length; L++) place(L, [0.24, 0.5, 0.36, 0.66, 0.8], 22, i => { crossings.push(i); for (let k = i - 2; k <= i + 2; k++) segs[k].crossing = true; }, 2);

  // uvoz v postaje: 40 km/h
  for (const st of stops) {
    for (let i = st - Math.round(200 / SEG); i < st + Math.round(150 / SEG); i++) {
      if (segs[i]) segs[i].limit = Math.min(segs[i].limit, 40);
    }
  }

  // tloris
  let x = 0, z = 0, ang = 0;
  for (const s of segs) {
    s.x = x; s.z = z; s.ang = ang;
    ang += s.curve / SEG;
    x += Math.cos(ang) * SEG; z += Math.sin(ang) * SEG;
  }

  // cone omejitev (za štetje prekrškov) in znaki
  let zone = 0;
  for (let i = 1; i < segs.length; i++) {
    if (segs[i].limit !== segs[i - 1].limit) {
      zone++;
      const v = segs[i].limit;
      const at = v < segs[i - 1].limit ? Math.max(0, i - Math.round(200 / SEG)) : i;
      signs.push({ i: at, v });
    }
    segs[i].zone = zone;
  }
  stops.forEach(st => {
    for (let i = st - Math.round(130 / SEG); i <= st + Math.round(15 / SEG); i++) segs[i].platform = true;
  });

  // podatki o odsekih
  for (let L = 0; L < LEGS.length; L++) {
    const a = stops[L], b = stops[L + 1];
    let climb = 0, desc = 0, sched = 0;
    const profile = [];
    for (let i = a; i < b; i++) {
      const dy = segs[i + 1].y - segs[i].y;
      if (dy > 0) climb += dy; else desc -= dy;
      const grade = dy / SEG;
      let vmax = segs[i].limit * 0.8 / 3.6;
      if (grade > 0.012) vmax = Math.min(vmax, (grade > 0.02 ? 38 : 48) / 3.6);
      sched += SEG / Math.max(4, vmax);
    }
    for (let k = 0; k <= 80; k++) profile.push(segs[Math.round(a + (b - a) * k / 80)].y);
    sched = Math.ceil((sched + 75) / 15) * 15;
    legInfo.push({ from: L, to: L + 1, len: (b - a) * SEG, climb, desc, sched, rain: LEGS[L].rain, tunnel: LEGS[L].tunnels.length > 0, profile });
  }

  const track = { segs, stops, legs: legInfo, signs, bridges, crossings, freeAt, len: segs.length * SEG };
  if (typeof decorate === 'function') decorate(track);
  return track;
}

function segIndex(track, pos) { return clamp(Math.floor(pos / SEG), 0, track.segs.length - 2); }
function segAt(track, pos) { return track.segs[segIndex(track, pos)]; }
function heightAt(track, pos) {
  const i = segIndex(track, pos);
  const f = clamp(pos / SEG - i, 0, 1);
  return lerp(track.segs[i].y, track.segs[i + 1].y, f);
}
function gradeAt(track, pos) {
  const i = segIndex(track, pos);
  return (track.segs[i + 1].y - track.segs[i].y) / SEG;
}
// točka v tlorisu na razdalji pos (m) in odmiku off (m, + = desno od smeri vožnje)
function trackPoint(track, pos, off = 0) {
  const i = segIndex(track, pos);
  const a = track.segs[i], b = track.segs[i + 1];
  const f = clamp(pos / SEG - i, 0, 1);
  const x = lerp(a.x, b.x, f), z = lerp(a.z, b.z, f);
  const ang = Math.atan2(b.z - a.z, b.x - a.x);
  return { x: x - Math.sin(ang) * off, z: z + Math.cos(ang) * off, ang };
}
// najnižja omejitev v naslednjih `ahead` metrih, ki je nižja od trenutne
function nextLimit(track, pos, ahead) {
  const cur = segAt(track, pos).limit;
  const i0 = segIndex(track, pos);
  const n = Math.round(ahead / SEG);
  for (let i = i0 + 1; i < Math.min(track.segs.length, i0 + n); i++) {
    if (track.segs[i].limit < cur) return { limit: track.segs[i].limit, dist: (i - i0) * SEG - (pos - i0 * SEG) };
  }
  return null;
}
