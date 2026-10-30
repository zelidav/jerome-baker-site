/* Every so often one of the crew on screen turns real for a few seconds: a hyperreal photo of the character
   stares at you, smiles, waves, then glitches back into a sticker. Works on the floaters, the crew page hero
   and the home hero, anywhere an <img> shows a crew sticker. Frames: assets/real/<img>/<pose>.webp
   (tools/build_real.py). Loaded by js/crew.js. Test hook: JBReal.now(). */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || window.JBReal) return;
  const base = document.documentElement.dataset.base || '';
  const R = window.JB_REAL_SET || ['lion', 'chimp', 'shark', 'octo', 'bot', 'bear', 'toucan', 'crude', 'alien', 'cobra', 'devil', 'gorilla', 'pumpkin', 'dillo', 'turtle', 'cy', 'spinners', 'peeper', 'mrx', 'grin'];
  // the home hero uses older cut-out names for two of the crew
  const ALIAS = { 'cut/lion': 'lion', 'cut/enlighten': 'octo', 'cut/honeypot': 'bear', 'cut/toucan': 'toucan', 'cut/porthole': 'peeper' };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);

  const who = (img) => {
    const src = img.getAttribute('src') || '';
    let m = src.match(/assets\/crew\/([a-z]+)(?:_[sm])?\.webp/);
    if (m && R.includes(m[1])) return m[1];
    m = src.match(/assets\/(cut\/[a-z]+)\.webp/);
    return m && ALIAS[m[1]] ? ALIAS[m[1]] : null;
  };
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 50 && r.top > 0 && r.bottom < innerHeight && r.left > 0 && r.right < innerWidth && getComputedStyle(el).visibility !== 'hidden' && !el.closest('dialog');
  };
  const frame = (k, p) => `${base}assets/real/${k}/${p}.webp`;
  const preload = (k) => ['stare', 'smile', 'wave1', 'wave2'].map((p) => { const i = new Image(); i.src = frame(k, p); return i.decode ? i.decode().catch(() => {}) : null; });

  let busy = 0;
  async function morph(img) {
    const k = who(img);
    if (!k || img.dataset.real) return;
    busy++;
    img.dataset.real = '1';
    await Promise.all(preload(k));
    const keep = { src: img.src, srcset: img.srcset, h: img.style.height, w: img.style.width, fit: img.style.objectFit };
    const r = img.getBoundingClientRect();
    // hold the sticker's box so the photo swaps in place
    img.style.width = r.width + 'px';
    img.style.height = r.height + 'px';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'bottom';
    img.removeAttribute('srcset');
    const glitch = () => img.animate([
      { filter: 'none', translate: '0 0' },
      { filter: 'drop-shadow(6px 0 0 #DA2342) drop-shadow(-6px 0 0 #05B48F) contrast(1.6)', translate: '4px -2px' },
      { filter: 'hue-rotate(90deg) saturate(3)', translate: '-5px 2px' },
      { filter: 'none', translate: '0 0' }], { duration: 260, easing: 'steps(4)' }).finished;
    await glitch();
    img.src = frame(k, 'stare');
    await wait(1100);
    img.src = frame(k, 'smile');
    await wait(700);
    for (let i = 0; i < 6; i++) { img.src = frame(k, i % 2 ? 'wave2' : 'wave1'); await wait(230); }
    img.src = frame(k, 'smile');
    await wait(500);
    await glitch();
    img.src = keep.src;
    if (keep.srcset) img.srcset = keep.srcset;
    img.style.width = keep.w; img.style.height = keep.h; img.style.objectFit = keep.fit; img.style.objectPosition = '';
    delete img.dataset.real;
    busy--;
  }

  const candidates = () => [...document.querySelectorAll('img')].filter((i) => who(i) && onScreen(i) && !i.dataset.real);
  async function now(n) {
    const pool = candidates().sort(() => Math.random() - .5);
    const count = n || (Math.random() < .15 ? Math.min(3, pool.length) : 1);
    await Promise.all(pool.slice(0, count).map(morph));
    return count;
  }
  window.JBReal = { now };

  // rare: the first one somewhere between half a minute and a minute in, then every couple of minutes
  let next = performance.now() + rand(30000, 60000);
  setInterval(() => {
    if (document.hidden || busy || document.body.classList.contains('sr-calm') || performance.now() < next) return;
    next = performance.now() + rand(80000, 160000);
    now().then((c) => { if (!c) next = performance.now() + 8000; });
  }, 1000);
})();
