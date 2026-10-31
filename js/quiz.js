'use strict';
// Matematični računi (raven 4.–5. razreda, kot v tank igri) – z njimi se plača premog v skladišču
// in reši kazen, ko zaloge pošle. Vnos s kolesci števk: ↕ številka, ↔ premik, A potrdi.
const QUIZ_TRIES = 3;

function makeQuestion(quick) {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const kind = quick ? pick(['add', 'sub', 'table', 'table', 'table', 'div', 'units', 'missing', 'fraction'])
    : pick(['add', 'sub', 'table', 'table', 'mul', 'div', 'div', 'divword', 'divword', 'train', 'train', 'units', 'units', 'fraction', 'missing']);
  if (kind === 'add') { const a = r(100, 899), b = r(100, 999 - a + 100); return [`${a} + ${b} = ?`, a + b, '']; }
  if (kind === 'sub') { const a = r(300, 1000), b = r(50, a - 1); return [`${a} − ${b} = ?`, a - b, '']; }
  if (kind === 'table') { const a = r(2, 10), b = r(2, 10); return pick([[`${a} · ${b} = ?`, a * b, ''], [`${a * b} : ${b} = ?`, a, '']]); }
  if (kind === 'mul') { const b = r(2, 9), a = r(11, 120); return [`${a} · ${b} = ?`, a * b, '']; }
  if (kind === 'div') { const b = r(2, 9), q = r(11, 99); return pick([[`${q * b} : ${b} = ?`, q, ''], [`${q * b} : □ = ${q}`, b, '']]); }
  if (kind === 'divword') {
    const b = r(2, 9), q = r(3, 25);
    return pick([
      [`${q * b} potnikov se enakomerno razporedi v ${b} vagonov. Koliko potnikov je v enem vagonu?`, q, ''],
      [`${q * b} zabojev zložimo na ${b} enakih kupov. Koliko zabojev je na enem kupu?`, q, ''],
      [`${b} enakih vozovnic stane ${q * b} €. Koliko stane ena vozovnica?`, q, '€'],
      [`Vlak v ${b} urah prevozi ${q * b} km. Koliko km prevozi v eni uri?`, q, 'km'],
    ]);
  }
  if (kind === 'train') {
    const a = r(3, 9), b = r(4, 12);
    return pick([
      [`Vlak ima ${a} vagonov, v vsakem sedi ${b} potnikov. Koliko potnikov je skupaj?`, a * b, ''],
      [`Kurjač naloži ${a} vozov premoga po 500 kg. Koliko kg je to?`, a * 500, 'kg'],
      [`Vlak vozi ${b * 5} km/h. Koliko km prevozi v ${a} urah?`, a * b * 5, 'km'],
      [`Ena tona premoga stane ${b * 10} €. Koliko stane ${a} ton?`, a * b * 10, '€'],
      [`V tenderju je ${a * 1000 + 500} kg premoga. Koliko vozov po 500 kg je to?`, a * 2 + 1, ''],
      [`Vlak odpelje ob 8:${String(b).padStart(2, '0')} in vozi ${a * 5} minut. Ob koliko minut čez 8 prispe?`, b + a * 5, 'min'],
    ]);
  }
  if (kind === 'units') {
    const a = r(2, 9), b = r(11, 99);
    return pick([
      [`${a} m ${b} cm = ? cm`, a * 100 + b, 'cm'], [`${a * 1000} m = ? km`, a, 'km'], [`${a} km = ? m`, a * 1000, 'm'],
      [`${a} t = ? kg`, a * 1000, 'kg'], [`${a * 1000} kg = ? t`, a, 't'], [`${a} h = ? min`, a * 60, 'min'],
      [`${a * 60} s = ? min`, a, 'min'], [`${a} l = ? dl`, a * 10, 'dl'],
    ]);
  }
  if (kind === 'fraction') { const d = r(2, 10), n = d * r(2, 12); return [`Koliko je 1/${d} od ${n}?`, n / d, '']; }
  const a = r(12, 80), b = r(5, 60);
  return pick([[`${a} + □ = ${a + b}`, b, ''], [`□ − ${b} = ${a}`, a + b, '']]);
}

const Quiz = (() => {
  // purpose: 'buy' (skladišče premoga, do `max` računov) ali 'penalty' (en pravilen račun za zasilno rezervo)
  function make(purpose, opts = {}) {
    const q = { purpose, what: opts.what || 'coal', max: opts.max || 1, done: 0, solvedT: 0, msg: '', msgCol: INK, shake: 0, onEnd: opts.onEnd,
      players: opts.players || [0, 1], quick: !!opts.quick, time: opts.time || 0 };
    next(q);
    return q;
  }
  function open(G, purpose, opts = {}) { G.quiz = make(purpose, opts); Snd.ding(); }
  // kurjačev račun med vožnjo: igra teče naprej, odgovarja samo P2
  function openMini(G) { G.mini = make('mini', { players: [1], quick: true, time: MINI_QUIZ_TIME }); Snd.ding(); }
  function next(q) {
    [q.text, q.answer, q.unit] = makeQuestion(q.quick);
    q.nd = Math.max(2, String(q.answer).length + 1);
    q.digits = new Array(q.nd).fill(0);
    q.cursor = q.nd - 1;
    q.tries = 0;
    q.revealed = false;
  }
  const value = q => +q.digits.join('');
  function typeDigit(G, d) {
    const q = G.quiz || G.mini; if (!q || q.solvedT > 0) return;
    q.digits = [...q.digits.slice(1), d];
  }

  // vrne true, ko je kviz končan
  function step(G, q, dt) {
    q.shake = Math.max(0, q.shake - dt);
    if (q.solvedT > 0) {
      q.solvedT -= dt;
      if (q.solvedT <= 0) {
        if (q.revealed && q.purpose !== 'mini') { next(q); q.msg = 'Nov račun:'; q.msgCol = INK; }
        else if (q.purpose === 'buy' && q.done < q.max) { next(q); q.msg = ''; }
        else return true;
      }
      return false;
    }
    if (q.time) {
      q.time -= dt;
      if (q.time <= 0) { G.addPoints(-5); q.msg = `Prepozno! Pravilno je ${q.answer}.`; q.msgCol = PAL.red2; q.revealed = true; q.solvedT = 2; Snd.bad(); return false; }
    }
    for (const i of q.players) {
      if (Ctl.repeat(i, 'left')) { q.cursor = (q.cursor + q.nd - 1) % q.nd; Snd.click(); }
      if (Ctl.repeat(i, 'right')) { q.cursor = (q.cursor + 1) % q.nd; Snd.click(); }
      if (Ctl.repeat(i, 'up')) { q.digits[q.cursor] = (q.digits[q.cursor] + 1) % 10; Snd.click(); }
      if (Ctl.repeat(i, 'down')) { q.digits[q.cursor] = (q.digits[q.cursor] + 9) % 10; Snd.click(); }
      if (Ctl.pressed(i, 'b') && q.purpose === 'buy') return true;
      if (Ctl.pressed(i, 'a')) { check(G, q); return false; }
    }
    return false;
  }
  function update(G, dt) {
    if (G.quiz && step(G, G.quiz, dt)) { const q = G.quiz; G.quiz = null; if (q.onEnd) q.onEnd(q); }
  }
  function updateMini(G, dt) {
    if (G.mini && step(G, G.mini, dt)) G.mini = null;
  }
  function check(G, q) {
    if (value(q) === q.answer) {
      q.done++;
      Snd.good();
      if (q.purpose === 'buy') { G.addPoints(5); G.train.coal = Math.min(TRAIN.coalCap, G.train.coal + 500); q.msg = `Pravilno! +1 voz premoga (${q.done}/${q.max})`; }
      else if (q.purpose === 'mini') { G.addPoints(10); q.msg = 'Pravilno! +10'; }
      else { G.addPoints(5); q.msg = 'Pravilno! Zasilna rezerva je tvoja.'; }
      q.msgCol = '#2d6a2d'; q.solvedT = 1.4;
    } else {
      q.tries++; q.shake = 0.4; G.addPoints(-2); Snd.bad();
      if (q.tries >= QUIZ_TRIES) { q.msg = `Pravilno je ${q.answer}${q.unit ? ' ' + q.unit : ''}.`; q.msgCol = PAL.red2; q.revealed = true; q.solvedT = 2.5; }
      else { q.msg = `Ni še prav – še ${QUIZ_TRIES - q.tries}×`; q.msgCol = PAL.red2; }
    }
  }

  // dolga besedila razlomi v vrstice
  function wrap(g, txt, maxW) {
    const words = txt.split(' '), lines = [];
    let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line);
    return lines;
  }
  function draw(g, G) {
    const q = G.quiz;
    g.fillStyle = 'rgba(29,22,17,0.55)'; g.fillRect(0, 0, W, H);
    const x = W / 2 - 360, y = 110, w = 720, h = 470;
    card(g, x, y, w, h, PAL.cream, 401, 22);
    const titles = { buy: 'SKLADIŠČE PREMOGA', penalty: { coal: 'ZMANJKALO JE PREMOGA!', water: 'ZMANJKALO JE VODE!', sand: 'ZMANJKALO JE PESKA!' }[q.what] };
    toonText(g, titles[q.purpose] || titles.buy, W / 2, y + 42, 34, q.purpose === 'buy' ? PAL.mustard : PAL.red, 'center', FONT_T, 6);
    plainText(g, q.purpose === 'buy' ? `Premog plačaš z računi: vsak pravilen = 1 voz (500 kg). Največ ${q.max}.` : 'Kazen: reši račun, da dobiš zasilno rezervo in lahko pelješ naprej.', W / 2, y + 82, 16, INK, 'center', FONT, 'normal');
    // vprašanje
    g.font = `bold 30px ${FONT}`;
    const lines = wrap(g, q.text, w - 80);
    lines.forEach((l, i) => plainText(g, l, W / 2, y + 140 + i * 38 - (lines.length - 1) * 12, 30, INK, 'center'));
    // kolesca
    const bw = 62, gap = 12, total = q.nd * bw + (q.nd - 1) * gap;
    const sx = W / 2 - total / 2 + (q.shake > 0 ? Math.sin(q.shake * 60) * 8 : 0), by = y + 250;
    for (let i = 0; i < q.nd; i++) {
      const bx = sx + i * (bw + gap), sel = i === q.cursor && q.solvedT <= 0;
      inkPoly(g, [bx, by, bx + bw, by, bx + bw, by + 80, bx, by + 80], sel ? '#fff3c4' : PAL.white, sel ? 4 : 3, 0.6, 410 + i);
      plainText(g, String(q.digits[i]), bx + bw / 2, by + 42, 48, INK, 'center');
      if (sel) { inkPoly(g, [bx + bw / 2 - 12, by - 8, bx + bw / 2 + 12, by - 8, bx + bw / 2, by - 24], PAL.yellow, 2.5, 0.4, 420); inkPoly(g, [bx + bw / 2 - 12, by + 88, bx + bw / 2 + 12, by + 88, bx + bw / 2, by + 104], PAL.yellow, 2.5, 0.4, 421); }
    }
    if (q.unit) plainText(g, q.unit, sx + total + 18, by + 42, 28, INK, 'left');
    if (q.msg) plainText(g, q.msg, W / 2, by + 132, 20, q.msgCol, 'center');
    // gumbi
    const ly = y + h - 34;
    let lx = W / 2 - (q.purpose === 'buy' ? 300 : 220);
    lx = legend(g, lx, ly, ['L↕'], 'številka'); lx = legend(g, lx + 26, ly, ['L↔'], 'premik'); lx = legend(g, lx + 26, ly, ['A'], 'potrdi');
    if (q.purpose === 'buy') legend(g, lx + 26, ly, ['B'], 'dovolj, odpelji');
    plainText(g, 'tipkovnica: vtipkaj številke in Enter', W / 2, y + h + 22, 13, PAL.cream, 'center', FONT, 'normal');
  }
  function drawMini(g, G) {
    const q = G.mini, x = W - 488, y = 300, w = 476, h = 238;
    card(g, x, y, w, h, '#fff3c4', 430, 14);
    toonText(g, 'KURJAČEV RAČUN', x + 18, y + 24, 20, PAL.teal, 'left', FONT_T, 4);
    // časovni trak
    const tf = clamp(q.time / MINI_QUIZ_TIME, 0, 1);
    inkPoly(g, [x + 250, y + 16, x + w - 18, y + 16, x + w - 18, y + 32, x + 250, y + 32], PAL.white, 2, 0.3, 431);
    g.fillStyle = tf > 0.3 ? '#9cc58a' : '#e58a74'; g.fillRect(x + 252, y + 18, (w - 272) * tf, 12);
    plainText(g, `${Math.ceil(Math.max(0, q.time))} s`, x + w - 26, y + 46, 12, INK, 'right');
    g.font = `bold 20px ${FONT}`;
    const lines = wrap(g, q.text, w - 40);
    lines.forEach((l, i) => plainText(g, l, x + w / 2, y + 64 + i * 24, 20, INK, 'center'));
    const bw = 42, gap = 8, total = q.nd * bw + (q.nd - 1) * gap;
    const sx = x + w / 2 - total / 2 + (q.shake > 0 ? Math.sin(q.shake * 60) * 6 : 0), by = y + 108;
    for (let i = 0; i < q.nd; i++) {
      const bx = sx + i * (bw + gap), sel = i === q.cursor && q.solvedT <= 0;
      inkPoly(g, [bx, by, bx + bw, by, bx + bw, by + 54, bx, by + 54], sel ? '#fff8dc' : PAL.white, sel ? 3.5 : 2.5, 0.5, 440 + i);
      plainText(g, String(q.digits[i]), bx + bw / 2, by + 29, 32, INK, 'center');
      if (sel) { inkPoly(g, [bx + bw / 2 - 9, by - 5, bx + bw / 2 + 9, by - 5, bx + bw / 2, by - 17], PAL.yellow, 2, 0.3, 450); inkPoly(g, [bx + bw / 2 - 9, by + 59, bx + bw / 2 + 9, by + 59, bx + bw / 2, by + 71], PAL.yellow, 2, 0.3, 451); }
    }
    if (q.unit) plainText(g, q.unit, sx + total + 12, by + 29, 20, INK, 'left');
    if (q.msg) plainText(g, q.msg, x + w / 2, by + 88, 16, q.msgCol, 'center');
    let lx = legend(g, x + 16, y + h - 18, ['L↕'], 'številka', 12); lx = legend(g, lx + 10, y + h - 18, ['L↔'], 'premik', 12);
    lx = legend(g, lx + 10, y + h - 18, ['A'], 'potrdi', 12);
    plainText(g, 'medtem ni lopate!', x + w - 18, y + h - 18, 12, PAL.red2, 'right');
  }
  return { open, openMini, update, updateMini, draw, drawMini, typeDigit };
})();
