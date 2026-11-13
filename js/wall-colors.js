/* The glass wall on the home page (#glass .cards): no two cards with the same background colour side by side or
   stacked on top of each other (feedback 11/12). The cards wrap differently at every screen width, so the colours
   are dealt out here from the real layout, and dealt again when the width changes. Cards with their own scene
   (the Maui sunsets) keep it; their colours count as taken for the cards next to them. */
(() => {
  const wall = document.querySelector('#glass .cards');
  if (!wall) return;
  const PAL = ['#FFF100', '#2A3B8E', '#DA2342', '#FFFFFF', '#05B48F', '#FDB514'];
  // colour families a fixed background is made of (a sunset is red into gold; the ocean is teal into blue)
  const FAM = { sunset: ['#DA2342', '#FDB514'], ocean: ['#05B48F', '#2A3B8E'] };
  const fixedOf = (c) => (c.dataset.scene ? FAM[c.dataset.scene] || [] : null);
  let lastW = 0;
  const deal = () => {
    const cards = [...wall.children].filter((c) => c.classList.contains('card'));
    if (!cards.length || wall.offsetWidth === lastW) return;
    lastW = wall.offsetWidth;
    const box = cards.map((c) => ({ l: c.offsetLeft, r: c.offsetLeft + c.offsetWidth, t: c.offsetTop }));
    const fam = [];
    let k = 0;
    cards.forEach((c, i) => {
      const fixed = fixedOf(c);
      if (fixed) { fam[i] = fixed; return; }
      const taken = new Set();
      for (let j = 0; j < i; j++) {
        const b = box[j], me = box[i];
        const sameRow = Math.abs(b.t - me.t) < 20;
        const left = sameRow && j === i - 1;
        // anything in the row above that overlaps this card horizontally
        const above = b.t < me.t - 20 && !box.some((o, q) => q < i && o.t > b.t + 20 && o.t < me.t - 20) && b.l < me.r && b.r > me.l;
        if (left || above) fam[j].forEach((f) => taken.add(f));
      }
      if (i + 1 < cards.length && fixedOf(cards[i + 1]) && Math.abs(box[i + 1].t - box[i].t) < 20) fixedOf(cards[i + 1]).forEach((f) => taken.add(f));
      // yellow and gold read as the same colour at a glance
      if (taken.has('#FFF100')) taken.add('#FDB514');
      if (taken.has('#FDB514')) taken.add('#FFF100');
      let pick = null;
      for (let n = 0; n < PAL.length; n++) { const c2 = PAL[(k + n) % PAL.length]; if (!taken.has(c2)) { pick = c2; k = (k + n + 1) % PAL.length; break; } }
      pick = pick || PAL[k++ % PAL.length];
      c.style.setProperty('--bg', pick);
      fam[i] = [pick];
    });
  };
  deal();
  let t = 0;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(deal, 150); }, { passive: true });
  addEventListener('load', () => { lastW = 0; deal(); });
})();
