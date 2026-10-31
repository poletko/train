'use strict';
// Videz starega filma: topel sepija ton, vinjeta, zrno, prah in praske, utripanje, tresenje slike, iris prehodi.
const FX = (() => {
  let vignette, grain = [], tick = 0;
  const dust = [];
  function init() {
    const [v, gv] = mk(W, H);
    const rg = gv.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.7, 'rgba(225,205,170,1)'); rg.addColorStop(1, 'rgba(120,90,60,1)');
    gv.fillStyle = rg; gv.fillRect(0, 0, W, H);
    vignette = v;
    for (let k = 0; k < 4; k++) {
      const [c, g] = mk(W / 2, H / 2);
      const img = g.createImageData(W / 2, H / 2);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = 128 + (Math.random() - 0.5) * 110;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = n; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grain.push(c);
    }
  }
  // pokliči pred risanjem prizora: rahlo tresenje slike (kot pri starem projektorju)
  function weave(g) {
    tick++;
    const wx = (hsh(Math.floor(tick / 3)) - 0.5) * 1.6, wy = (hsh(Math.floor(tick / 3) + 99) - 0.5) * 1.6;
    g.setTransform(1, 0, 0, 1, wx, wy);
  }
  function post(g) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#f6e3bd'; g.fillRect(0, 0, W, H);
    g.drawImage(vignette, 0, 0);
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = 0.28;
    g.drawImage(grain[Math.floor(tick / 2) % grain.length], (tick * 37) % 7 - 4, (tick * 53) % 7 - 4, W + 8, H + 8);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // prah in dlačice
    if (Math.random() < 0.25) dust.push({ x: Math.random() * W, y: Math.random() * H, life: 2 + Math.floor(Math.random() * 3), k: Math.random() < 0.3 ? 'hair' : 'dot', r: 1 + Math.random() * 2.5, a: Math.random() * 6 });
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      g.strokeStyle = g.fillStyle = 'rgba(29,22,17,0.55)';
      if (d.k === 'dot') { g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fill(); }
      else { g.lineWidth = 1; g.beginPath(); g.moveTo(d.x, d.y); g.quadraticCurveTo(d.x + 8 * Math.cos(d.a), d.y + 10, d.x + 14 * Math.sin(d.a), d.y + 18); g.stroke(); }
      if (--d.life <= 0) dust.splice(i, 1);
    }
    // navpična praska
    if (hsh(Math.floor(tick / 20)) < 0.25) {
      const x = hsh(Math.floor(tick / 20) + 5) * W + Math.sin(tick * 0.3) * 3;
      g.fillStyle = 'rgba(255,248,230,0.35)'; g.fillRect(x, 0, 1.5, H);
    }
    // utripanje svetlobe
    const fl = (hsh(tick) - 0.5) * 0.05;
    g.fillStyle = fl > 0 ? `rgba(255,248,230,${fl})` : `rgba(29,22,17,${-fl})`;
    g.fillRect(0, 0, W, H);
  }
  // iris: r = 0 popolnoma zaprto, r >= 1 odprto
  function iris(g, r, cx = W / 2, cy = H / 2) {
    if (r >= 1) return;
    const R = r * Math.hypot(W, H) * 0.6;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = INK; g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, Math.max(0.1, R), 0, Math.PI * 2, true); g.fill();
    if (R > 2) { g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = '#3a2c20'; g.stroke(); }
  }
  // travnata podlaga (ponavljajoča se ploščica z akvarelnimi madeži)
  function grassTile(base, dark, light, seed) {
    const S = 512;
    const [c, g] = mk(S, S);
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    const r = mulberry32(seed);
    const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
    for (let i = 0; i < 40; i++) {
      const x = r() * S, y = r() * S, rad = 20 + r() * 70, col = r() < 0.5 ? dark : light;
      wrap(() => { g.globalAlpha = 0.18; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rad, rad * 0.6, r() * 3, 0, 7); g.fill(); });
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 220; i++) {
      const x = r() * S, y = r() * S;
      wrap(() => {
        g.strokeStyle = 'rgba(60,70,30,0.35)'; g.lineWidth = 1.4; g.beginPath();
        g.moveTo(x, y); g.lineTo(x - 2, y - 6); g.moveTo(x + 3, y); g.lineTo(x + 4, y - 5); g.stroke();
      });
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * S, y = r() * S;
      wrap(() => { g.fillStyle = ['#fff6d8', '#f7d96b', '#f0a8b8'][i % 3]; g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); });
    }
    return c;
  }
  return { init, weave, post, iris, grassTile };
})();
