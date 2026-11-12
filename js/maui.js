/* Jason Harris Maui Originals: the home page's lead section. Two hand pipes off Jason's Maui bench.
   Each card: the cut-out pipe (two angles) floating in the stage, pulsing hotspots on every marble, a magnifier on
   hover, and the marbles as round close-ups that open the full-screen zoom (js/zoomview.js) right on that marble.
   Photos: ~/code/jbsite-work/maui (4 HEICs from David, 2026-11-11), cut out with BiRefNet.
   Selling: both are registered in jbd-glass (series "Maui Originals", SPC 1-of-1, $450, online sale), so the
   /buy page quotes shipping from Kihei. */
(() => {
  const root = document.getElementById('maui');
  if (!root) return;
  const A = 'assets/maui/';
  const BUY = 'https://jbcustomer.cannacrypted.com/buy/';
  const PIPES = [
    {
      key: 'pipe1', name: 'Maui Original No. 1', price: 450, buy: BUY + 'JBD-C4A961A67688',
      line: 'Amber ring, opal moon and a dichro stripe that flips color as you turn it.',
      angles: [{ img: 'pipe1a', w: 2553, h: 1542 }, { img: 'pipe1b', w: 2547, h: 1551 }],
      // fx, fy: the marble's center as fractions of angle 0
      marbles: [
        ['ring', 'Amber ring', .435, .149], ['opal', 'Opal moon', .51, .671], ['stripe', 'Dichro stripe', .76, .497],
        ['ember', 'Ember', .91, .571], ['amber', 'Honey drop', .632, .162],
      ],
    },
    {
      key: 'pipe2', name: 'Maui Original No. 2', price: 450, buy: BUY + 'JBD-F685F0241C9C',
      line: 'Ruby, a pink nebula full of seeds, and a violet that goes clear at the rim.',
      angles: [{ img: 'pipe2a', w: 2107, h: 1402 }, { img: 'pipe2b', w: 2791, h: 1695 }],
      marbles: [
        ['ruby', 'Ruby', .10, .474], ['pink', 'Pink nebula', .46, .617], ['violet', 'Violet rim', .175, .782],
        ['drop', 'Garnet drop', .412, .311],
      ],
    },
  ];
  const money = (n) => '$' + n.toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const coarse = matchMedia('(pointer: coarse)').matches;

  // The drawn picture inside an object-fit:contain <img>, in client coordinates.
  const drawn = (img, a) => {
    const r = img.getBoundingClientRect();
    const s = Math.min(r.width / a.w, r.height / a.h), w = a.w * s, h = a.h * s;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  };

  const grid = root.querySelector('.maui-pipes');
  grid.innerHTML = PIPES.map((p) => {
    const buy = p.buy
      ? `<a class="btn btn-red" href="${p.buy}" target="_blank" rel="noopener">Buy it, ${money(p.price)}</a>`
      : `<a class="btn btn-red" href="mailto:sales@jeromebakerny.com?subject=${encodeURIComponent(`Jason Harris Maui Original: ${p.name}`)}">Hold it for me, ${money(p.price)}</a>`;
    return `<article class="maui-card" data-k="${p.key}">
<div class="maui-stage"><span class="maui-pill">1 of 1</span><span class="maui-pill ship">Ships from Maui</span>
<div class="maui-float"><img class="maui-pipe" src="${A}${p.angles[0].img}.webp" alt="${esc(p.name)}, hand pipe by Jason Harris" width="${p.angles[0].w}" height="${p.angles[0].h}" decoding="async">
<div class="maui-spots">${p.marbles.map(([, label, fx, fy], i) => `<button type="button" class="maui-spot" data-m="${i}" style="left:${fx * 100}%;top:${fy * 100}%" aria-label="Zoom in on the ${esc(label)} marble" tabindex="-1"></button>`).join('')}</div></div>
<span class="maui-sheen" aria-hidden="true"></span>
<span class="maui-loupe" aria-hidden="true"></span></div>
<div class="maui-angles" role="group" aria-label="Angles">${p.angles.map((a, i) => `<button type="button" data-i="${i}" aria-pressed="${!i}" aria-label="${i ? 'Back' : 'Front'} side"><img src="${A}${a.img}_t.webp" alt="" loading="lazy"></button>`).join('')}</div>
<h3 class="maui-name">${esc(p.name)}</h3>
<p class="maui-line">${esc(p.line)}</p>
<p class="maui-mk">The marbles <span>Tap one to zoom in</span></p>
<div class="maui-marbles">${p.marbles.map(([k, label], i) => `<button type="button" data-m="${i}" aria-label="Zoom in on the ${esc(label)} marble"><img src="${A}m${p.key.slice(-1)}-${k}.webp" alt="" loading="lazy"><span>${esc(label)}</span></button>`).join('')}</div>
<div class="maui-buy"><span class="maui-price">${money(p.price)}<small>+ shipping, calculated from Maui at checkout</small></span>${buy}</div>
</article>`;
  }).join('');

  const zoom = (p, angle, at) => {
    if (!window.JBZoom) return;
    const photos = p.angles.map((a, i) => ({ src: `${A}${a.img}_z.webp`, w: a.w, h: a.h, alt: `${p.name}, ${i ? 'back' : 'front'}`, label: i ? 'Back' : 'Front', thumb: `${A}${a.img}_t.webp` }));
    JBZoom.open({ photos, index: angle, at });
  };

  const cards = [...root.querySelectorAll('.maui-card')].map((card) => {
    const p = PIPES.find((x) => x.key === card.dataset.k);
    const img = card.querySelector('.maui-pipe'), lens = card.querySelector('.maui-loupe'), stage = card.querySelector('.maui-stage');
    const spots = card.querySelector('.maui-spots');
    let angle = 0;
    // keep the hotspot layer exactly over the drawn pipe (the img letterboxes inside its box)
    const place = () => {
      const d = drawn(img, p.angles[angle]), sr = img.parentElement.getBoundingClientRect();
      Object.assign(spots.style, { left: `${d.left - sr.left}px`, top: `${d.top - sr.top}px`, width: `${d.width}px`, height: `${d.height}px` });
    };
    img.addEventListener('load', place);
    card.querySelector('.maui-angles').addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      angle = +b.dataset.i;
      const a = p.angles[angle];
      img.src = `${A}${a.img}.webp`; img.width = a.w; img.height = a.h;
      spots.hidden = angle !== 0; // marble positions are mapped on the front
      card.querySelectorAll('.maui-angles button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
    const openMarble = (i) => { const m = p.marbles[i]; zoom(p, 0, [m[2], m[3]]); };
    card.querySelector('.maui-marbles').addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (b) openMarble(+b.dataset.m);
    });
    spots.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (b) { e.stopPropagation(); openMarble(+b.dataset.m); }
    });
    // light up the matching hotspot while a marble chip is hovered or focused
    const hot = (i) => spots.querySelectorAll('.maui-spot').forEach((s) => s.classList.toggle('hot', s.dataset.m === i));
    card.querySelectorAll('.maui-marbles [data-m]').forEach((b) => {
      b.addEventListener('pointerenter', () => hot(b.dataset.m)); b.addEventListener('pointerleave', () => hot(null));
      b.addEventListener('focus', () => hot(b.dataset.m)); b.addEventListener('blur', () => hot(null));
    });
    // click the pipe: zoom where you clicked
    stage.addEventListener('click', (e) => {
      if (e.target.closest('.maui-spot')) return;
      const d = drawn(img, p.angles[angle]);
      const fx = (e.clientX - d.left) / d.width, fy = (e.clientY - d.top) / d.height;
      zoom(p, angle, [Math.min(1, Math.max(0, fx)), Math.min(1, Math.max(0, fy))]);
    });
    if (!coarse) {
      // a magnifier that follows the mouse and shows the real pixels
      const K = 3.2;
      stage.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const d = drawn(img, p.angles[angle]), sr = stage.getBoundingClientRect();
        const fx = (e.clientX - d.left) / d.width, fy = (e.clientY - d.top) / d.height;
        const onSpot = e.target.closest('.maui-spot');
        if (onSpot || fx < 0 || fx > 1 || fy < 0 || fy > 1) { lens.classList.remove('on'); stage.classList.remove('lensing'); return; }
        const url = `${A}${p.angles[angle].img}_z.webp`;
        if (lens.dataset.src !== url) { lens.dataset.src = url; lens.style.backgroundImage = `url(${url})`; }
        const L = lens.offsetWidth || 200;
        lens.style.backgroundSize = `${d.width * K}px ${d.height * K}px`;
        lens.style.backgroundPosition = `${L / 2 - fx * d.width * K}px ${L / 2 - fy * d.height * K}px`;
        lens.style.left = `${e.clientX - sr.left - L / 2}px`; lens.style.top = `${e.clientY - sr.top - L / 2}px`;
        lens.classList.add('on'); stage.classList.add('lensing');
      });
      stage.addEventListener('pointerleave', () => { lens.classList.remove('on'); stage.classList.remove('lensing'); });
    }
    return place;
  });
  const placeAll = () => cards.forEach((f) => f());
  placeAll();
  addEventListener('resize', placeAll, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(placeAll).observe(grid);
})();
