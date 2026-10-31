'use strict';
// Vhod: dva Xbox kontrolerja (Gamepad API) + tipkovnica kot rezerva za vsakega igralca.
const Ctl = (() => {
  const keys = {};
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  const KB = [
    { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'KeyE', b: 'KeyQ', x: 'KeyF', y: 'KeyR', lt: 'Space', rt: 'ShiftLeft', start: 'Escape' },
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'Enter', b: 'Backspace', x: 'Slash', y: 'Quote', lt: 'ControlRight', rt: 'ShiftRight', start: 'KeyP' },
  ];
  const BTN = ['a', 'b', 'x', 'y', 'lb', 'rb', 'start', 'up', 'down', 'left', 'right'];
  const blank = () => ({ lx: 0, ly: 0, lt: 0, rt: 0, a: false, b: false, x: false, y: false, lb: false, rb: false, start: false, up: false, down: false, left: false, right: false });
  const p = [blank(), blank()];
  const prev = [blank(), blank()];
  const hold = [{}, {}];
  const rep = [{}, {}];
  const pads = [null, null];
  // Kontroler dobi vlogo, ko na njem pritisneš A (kot v tank igri). Ploščki, ki pritisk zrcalijo
  // v isti sličici (npr. navidezni "xboxdrv userspace driver"), se označijo kot dvojniki in prezrejo.
  const owner = [null, null];          // gamepad.index za P1, P2
  const alias = new Set();
  const lastA = {};
  const dz = v => Math.abs(v) < 0.22 ? 0 : v;

  function assign(list) {
    const down = list.filter(g => g.buttons[0] && g.buttons[0].pressed && !lastA[g.index]);
    for (const g of list) lastA[g.index] = !!(g.buttons[0] && g.buttons[0].pressed);
    // dvojnik zrcali stanje že dodeljenega ploščka (tudi z zamikom sličice, dokler je gumb še pritisnjen)
    const mirrors = (a, b) => a.buttons.every((x, i) => !b.buttons[i] || x.pressed === b.buttons[i].pressed)
      && a.axes.every((v, i) => Math.abs(v - (b.axes[i] || 0)) < 0.15);
    for (const g of down) {
      if (owner.includes(g.index) || alias.has(g.index)) continue;
      if (owner.some(o => o !== null && o !== g.index && list.find(x => x.index === o) && mirrors(g, list.find(x => x.index === o)))) alias.add(g.index);
    }
    const fresh = down.filter(g => !owner.includes(g.index) && !alias.has(g.index));
    if (!fresh.length) return;
    // če pritisk hkrati pride z že dodeljenega ploščka, so vsi novi le njegovi dvojniki
    if (down.some(g => owner.includes(g.index))) { fresh.forEach(g => alias.add(g.index)); return; }
    fresh.sort((a, b) => /userspace/i.test(a.id) - /userspace/i.test(b.id));
    const slot = owner.indexOf(null);
    if (slot < 0) return;
    owner[slot] = fresh[0].index;
    fresh.slice(1).forEach(g => alias.add(g.index));
  }

  function update(dt) {
    const list = (navigator.getGamepads && !location.hash.includes('nopad') ? Array.from(navigator.getGamepads()) : []).filter(g => g && g.connected);
    for (let i = 0; i < 2; i++) if (owner[i] !== null && !list.some(g => g.index === owner[i])) owner[i] = null;
    assign(list);
    for (let i = 0; i < 2; i++) {
      Object.assign(prev[i], p[i]);
      const s = blank(), k = KB[i], g = list.find(x => x.index === owner[i]) || null;
      pads[i] = g;
      if (g) {
        const b = n => !!(g.buttons[n] && g.buttons[n].pressed);
        const bv = n => g.buttons[n] ? g.buttons[n].value : 0;
        s.lx = dz(g.axes[0] || 0); s.ly = -dz(g.axes[1] || 0);
        s.a = b(0); s.b = b(1); s.x = b(2); s.y = b(3); s.lb = b(4); s.rb = b(5);
        s.lt = bv(6); s.rt = bv(7); s.start = b(9) || b(8);
        s.up = b(12); s.down = b(13); s.left = b(14); s.right = b(15);
      }
      for (const n of ['a', 'b', 'x', 'y', 'start', 'up', 'down', 'left', 'right']) if (keys[k[n]]) s[n] = true;
      if (keys[k.lt]) s.lt = 1;
      if (keys[k.rt]) s.rt = 1;
      // smeri za menije (d-pad, palica, tipke)
      const dir = { up: s.up || s.ly > 0.55, down: s.down || s.ly < -0.55, left: s.left || s.lx < -0.55, right: s.right || s.lx > 0.55 };
      for (const d in dir) {
        const was = (hold[i][d] || 0) > 0;
        if (dir[d]) {
          const h = (hold[i][d] || 0) + dt;
          rep[i][d] = !was || (h > 0.35 && Math.floor((h - 0.35) / 0.07) !== Math.floor((h - 0.35 - dt) / 0.07));
          hold[i][d] = h;
        } else { hold[i][d] = 0; rep[i][d] = false; }
      }
      Object.assign(p[i], s);
    }
  }
  const pressed = (i, n) => p[i][n] && !prev[i][n];
  const repeat = (i, d) => !!rep[i][d];
  const anyKey = () => Object.values(keys).some(Boolean);
  function rumble(i, strong, weak, ms) {
    const g = pads[i];
    if (g && g.vibrationActuator && g.vibrationActuator.playEffect) {
      g.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
    }
  }
  const padName = i => pads[i] ? pads[i].id.replace(/\(.*?\)/g, '').trim().slice(0, 34) : null;
  const padCount = () => (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter(g => g && g.connected && !alias.has(g.index)).length;
  return { p, update, pressed, repeat, rumble, padName, padCount, anyKey, BTN };
})();
