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
    dispatchEvent(new CustomEvent('jb-real', { detail: 'start' }));
    await Promise.all(preload(k));
    const keep = { src: img.src, srcset: img.srcset, h: img.style.height, w: img.style.width, fit: img.style.objectFit };
    const r = img.getBoundingClientRect();
    // hold the sticker's box so the photo swaps in place
    img.style.width = r.width + 'px';
    img.style.height = r.height + 'px';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'bottom';
    img.removeAttribute('srcset');
    // a quick flicker and jolt; no color filters, so nothing gets stuck tinted on slow phones
    const glitch = async () => {
      const a = img.animate([
        { opacity: 1, translate: '0 0', scale: '1 1' },
        { opacity: .2, translate: '6px -3px', scale: '1.04 .96' },
        { opacity: 1, translate: '-6px 3px', scale: '.97 1.03' },
        { opacity: .4, translate: '3px 0', scale: '1 1' },
        { opacity: 1, translate: '0 0', scale: '1 1' }], { duration: 280, easing: 'steps(5)' });
      await a.finished.catch(() => {});
      a.cancel();
    };
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
    img.style.filter = '';
    delete img.dataset.real;
    busy--;
    dispatchEvent(new CustomEvent('jb-real', { detail: 'end' }));
  }

  const candidates = () => [...document.querySelectorAll('img')].filter((i) => who(i) && onScreen(i) && !i.dataset.real);
  async function now(n) {
    const pool = candidates().sort(() => Math.random() - .5);
    const count = n || (Math.random() < .25 ? Math.min(3, pool.length) : 1);
    await Promise.all(pool.slice(0, count).map(morph));
    return count;
  }
  window.JBReal = { now };

  // on a character's own page their hero turns real 2-3 seconds after you land
  const crewPage = /\/crew\/(?!match\/)[a-z0-9-]+\/?$/.test(location.pathname);
  if (crewPage) {
    setTimeout(() => {
      // the hero can be taller than the screen; it only has to be in view
      const hero = [...document.querySelectorAll('.cp-hero img')].find((i) => { const r = i.getBoundingClientRect(); return who(i) && r.width > 50 && r.top < innerHeight && r.bottom > 0; });
      if (hero && !busy) morph(hero);
    }, rand(2000, 3000));
  }
  // the first one within a few seconds of landing, then every 20-40 seconds
  let next = performance.now() + (crewPage ? rand(14000, 22000) : rand(6000, 12000));
  setInterval(() => {
    if (document.hidden || busy || performance.now() < next) return;
    next = performance.now() + rand(20000, 40000);
    now().then((c) => { if (!c) next = performance.now() + 8000; });
  }, 1000);
})();
