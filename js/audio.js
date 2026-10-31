'use strict';
// Sintetizirani zvoki (WebAudio), brez zunanjih datotek.
const Snd = (() => {
  let ac = null, master, noise, hissG, whistleG, rainG, squealG, slipG, musicG, mus = null;
  function loop(filterType, freq, q) {
    const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ac.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(master); src.start();
    return g;
  }
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    musicG = ac.createGain(); musicG.gain.value = 0.16; musicG.connect(master);
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    hissG = loop('highpass', 2800);
    rainG = loop('lowpass', 1400);
    slipG = loop('bandpass', 700, 2);
    // piščalka: akord treh tonov
    whistleG = ac.createGain(); whistleG.gain.value = 0;
    const wf = ac.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 2600;
    wf.connect(whistleG).connect(master);
    for (const fr of [466, 587, 698]) {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
      const og = ac.createGain(); og.gain.value = 0.25; o.connect(og).connect(wf); o.start();
    }
    const wn = ac.createBufferSource(); wn.buffer = noise; wn.loop = true;
    const wnf = ac.createBiquadFilter(); wnf.type = 'bandpass'; wnf.frequency.value = 600; wnf.Q.value = 3;
    const wng = ac.createGain(); wng.gain.value = 0.3; wn.connect(wnf).connect(wng).connect(wf); wn.start();
    // cviljenje zavor
    squealG = ac.createGain(); squealG.gain.value = 0; squealG.connect(master);
    const so = ac.createOscillator(); so.type = 'sine'; so.frequency.value = 2300;
    const lfo = ac.createOscillator(); lfo.frequency.value = 6; const lg = ac.createGain(); lg.gain.value = 40;
    lfo.connect(lg).connect(so.frequency); lfo.start(); so.connect(squealG); so.start();
  }
  function burst(type, freq, q, vol, dur, delay = 0) {
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const src = ac.createBufferSource(); src.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0, Math.random() * 1.5, dur + 0.05);
  }
  function tone(freq, vol, dur, type = 'sine', delay = 0) {
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // ---------- ragtime glasba (oom-pah bas, akordi na 2 in 4, poskočna melodija) ----------
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const PROG = [
    { bass: 41, chord: [65, 69, 72] }, { bass: 38, chord: [62, 66, 69, 72] },
    { bass: 43, chord: [67, 71, 74, 77] }, { bass: 36, chord: [64, 67, 70, 72] },
  ];
  function note(freq, t0, dur, vol, type, cutoff = 2400) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = freq;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f).connect(g).connect(musicG); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  let melLast = 72;
  function step(i, t0, energy) {
    const bar = Math.floor(i / 8) % 16, pos = i % 8;
    const ch = PROG[Math.floor(bar / 2) % 4];
    const swing = pos % 2 ? 0.06 : 0;
    const t = t0 + swing;
    if (pos === 0 || pos === 4) note(midi(ch.bass + (pos === 4 ? 7 : 0)), t, 0.28, 0.5, 'triangle', 900);
    if (pos === 2 || pos === 6) for (const n of ch.chord) note(midi(n), t, 0.14, 0.09, 'square', 1600);
    if (Math.random() < 0.35 + energy * 0.45) {
      const tones = ch.chord.map(n => n + 12);
      let cand = tones.reduce((a, b) => Math.abs(b - melLast) < Math.abs(a - melLast) && Math.random() < 0.7 ? b : a);
      if (Math.random() < 0.3) cand = tones[Math.floor(Math.random() * tones.length)];
      melLast = cand;
      note(midi(cand), t, 0.18, 0.13, 'triangle', 3200);
      if (pos === 7 && Math.random() < 0.4) note(midi(cand + 2), t + 0.08, 0.1, 0.08, 'triangle');
    }
    if (pos % 2 === 0) burstTo(musicG, 'highpass', 6000, 1, 0.05 + energy * 0.04, 0.03, t);
  }
  function burstTo(dest, type, freq, q, vol, dur, t0) {
    const src = ac.createBufferSource(); src.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(dest); src.start(t0, Math.random(), dur + 0.02);
  }
  function music(energy = 0.5) {
    if (!ac || ac.state !== 'running') return;
    const spb = 60 / BPM / 2;
    if (!mus || mus.next < ac.currentTime - 0.5) mus = { next: ac.currentTime + 0.05, i: 0 };
    while (mus.next < ac.currentTime + 0.2) { step(mus.i, mus.next, energy); mus.next += spb; mus.i++; }
  }
  const set = (g, v) => { if (ac && g) g.gain.setTargetAtTime(v, ac.currentTime, 0.05); };
  return {
    init, music,
    musicVol(v) { if (musicG) musicG.gain.setTargetAtTime(v, ac.currentTime, 0.3); },
    chuff(vol) { burst('bandpass', 380 + Math.random() * 160, 0.9, 0.5 * vol + 0.08, 0.2); burst('lowpass', 160, 1, 0.35 * vol, 0.15); },
    clack(vol) { burst('bandpass', 2600, 4, vol * 0.5, 0.04); burst('bandpass', 2300, 4, vol * 0.45, 0.04, 0.09); },
    shovel() { burst('bandpass', 1800, 1.5, 0.25, 0.18); burst('lowpass', 300, 1, 0.35, 0.12, 0.12); },
    ding() { tone(1250, 0.25, 1.4); tone(1875, 0.08, 1.0); },
    clank() { tone(140, 0.4, 0.4, 'square'); tone(95, 0.4, 0.6, 'square', 0.08); burst('bandpass', 900, 3, 0.4, 0.3); },
    splash() { burst('lowpass', 700, 0.8, 0.9, 0.9); burst('bandpass', 2200, 1, 0.4, 0.6, 0.1); },
    bleat() {
      if (!ac) return;
      for (let k = 0; k < 2; k++) {
        const t0 = ac.currentTime + k * 0.32, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = 380 + k * 40; lfo.frequency.value = 22; lg.gain.value = 30;
        lfo.connect(lg).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.12, t0 + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.5;
        o.connect(f).connect(g).connect(master); o.start(t0); lfo.start(t0); o.stop(t0 + 0.32); lfo.stop(t0 + 0.32);
      }
    },
    boom() { burst('lowpass', 220, 0.7, 1.4, 3.2); burst('lowpass', 900, 0.5, 0.8, 1.2); },
    click() { tone(900, 0.12, 0.06, 'square'); },
    pump() { burst('lowpass', 260, 1, 0.35, 0.18); burst('bandpass', 900, 2, 0.12, 0.12, 0.05); },
    saw(dir) { burst('bandpass', dir > 0 ? 2400 : 1900, 2.5, 0.22, 0.16); },
    toss() { burst('bandpass', 700, 1.2, 0.25, 0.12); tone(520, 0.06, 0.1, 'triangle'); },
    bonk() { tone(330, 0.25, 0.12, 'square'); tone(180, 0.2, 0.2, 'triangle', 0.04); },
    fire() { burst('lowpass', 500, 0.6, 0.6, 0.8); burst('bandpass', 1200, 0.8, 0.25, 0.6, 0.05); },
    twang() { tone(110, 0.3, 0.5, 'sawtooth'); tone(220, 0.15, 0.3, 'triangle'); burst('bandpass', 3000, 2, 0.2, 0.1); },
    roar() { tone(90, 0.35, 0.7, 'sawtooth'); tone(70, 0.3, 0.9, 'square', 0.1); burst('lowpass', 400, 0.7, 0.4, 0.8); },
    whee() { if (!ac) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(400, t0); o.frequency.exponentialRampToValueAtTime(1400, t0 + 0.6); o.frequency.exponentialRampToValueAtTime(300, t0 + 1.4); g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5); o.connect(g).connect(master); o.start(t0); o.stop(t0 + 1.6); },
    bad() { tone(220, 0.2, 0.25, 'sawtooth'); },
    good() { tone(660, 0.15, 0.15); tone(990, 0.15, 0.25, 'sine', 0.1); },
    setHiss: v => set(hissG, v * 0.35),
    setRain: v => set(rainG, v * 0.12),
    setSlip: v => set(slipG, v * 0.25),
    setWhistle: on => set(whistleG, on ? 0.35 : 0),
    setSqueal: v => set(squealG, v * 0.05),
    mute() { if (ac) master.gain.value = master.gain.value > 0 ? 0 : 0.55; },
  };
})();
