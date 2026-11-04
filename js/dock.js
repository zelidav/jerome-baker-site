/* The phone menu: a glass tube docked to the bottom of the screen (css/dock.css).
   The tube fills with sm0ke as you scroll down the page and bubbles when you scroll fast.
   The JB mark in the middle is the b0wl: tap it and the whole menu spills out as stickers. */
(() => {
  if (document.querySelector('.dock')) return;
  const base = document.documentElement.dataset.base || '';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'css/dock.css';
  document.head.appendChild(css);

  const path = location.pathname;
  const here = /\/glass\//.test(path) ? 'glass' : /\/shop\//.test(path) ? 'shop' : /\/comics\//.test(path) ? 'comics'
    : /\/crew\/match\//.test(path) ? 'match' : /\/crew\//.test(path) ? 'crew' : /\/travel\//.test(path) ? 'travel' : 'home';

  const ICON = {
    glass: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 3h6v4h-1v9.5c3.6 1.2 6 4.4 6 8.1C24 29 20.4 30 16 30s-8-1-8-5.4c0-3.7 2.4-6.9 6-8.1V7h-1z"/><path class="ln" d="M20 19l6-5m-1.5-1.5L28 16"/></svg>',
    shop: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 4l-8 4 3 7 3-1.5V28h14V13.5l3 1.5 3-7-8-4c-.8 2-2.6 3-5 3s-4.2-1-5-3z"/></svg>',
    crew: `<img src="${base}assets/crew/lion_s.webp" alt="" width="30" height="30" loading="lazy">`,
    comics: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2c1 5 7 8 7 15a7 7 0 0 1-14 0c0-3 1.5-5 3-6.5 0 3 1.5 4.5 3 4.5-1-4 1-9 1-13z"/></svg>',
  };
  const TABS = [
    ['glass', 'Glass', 'glass/'],
    ['shop', 'Ritual Merch', 'shop/'],
    null,  // the b0wl
    ['crew', 'The JB Crew', 'crew/'],
    ['comics', 'The Hot Shop', 'comics/'],
  ];
  // everything, for the sticker pile
  const ALL = [
    ['Glass', 'glass/', 'blue', 'Hand blown. One of one.'],
    ['Ritual Merch', 'shop/', 'red', 'Wear the box art.'],
    ['The JB Crew', 'crew/', 'yellow', 'Twenty lunatics. No supervision.'],
    ['Find Your Crew', 'crew/match/', 'teal', 'Four questions. No lying.'],
    ['The Hot Shop', 'comics/', 'red', 'The comic. 21+.'],
    ['The Story', '#made', 'white', 'Since 1991.'],
    ['Travel Guide', 'travel/', 'yellow', 'Where to go next.'],
    ['Join the JB Fam', 'join/', 'red', 'First look at every drop.'],
    ['Wholesale', 'wholesale/', 'teal', 'Carry JB in your store.'],
    ['Home', '', 'blue', 'Back to the chaos.'],
  ];
  const href = (h) => base + h || './';

  const dock = document.createElement('nav');
  dock.className = 'dock';
  dock.setAttribute('aria-label', 'Phone menu');
  dock.innerHTML = `<div class="tube" aria-hidden="true"><i class="fill"></i><i class="shine"></i><b class="bubbles"></b></div>` +
    TABS.map((t) => t ? `<a class="tab${t[0] === here || (t[0] === 'crew' && here === 'match') ? ' on' : ''}" href="${href(t[2])}"${t[0] === here ? ' aria-current="page"' : ''}>${ICON[t[0]]}<span>${t[1]}</span></a>`
      : `<button class="bowl" type="button" aria-expanded="false" aria-controls="dockPile"><img src="${base}assets/img/jb-mark.webp" alt="" width="58" height="45"><span class="dock-sr">All of it</span></button>`).join('');

  const pile = document.createElement('div');
  pile.className = 'pile';
  pile.id = 'dockPile';
  pile.hidden = true;
  pile.innerHTML = `<div class="pile-smoke" aria-hidden="true"></div><ul>` +
    ALL.map(([name, h, tone, sub], i) => `<li style="--i:${i};--r:${((i * 37) % 9 - 4) * 1.4}deg"><a class="stk ${tone}" href="${href(h)}">${name}<small>${sub}</small></a></li>`).join('') +
    `</ul><button class="pile-x" type="button">Put it back</button>`;

  document.body.append(pile, dock);
  document.body.classList.add('has-dock');

  // ---- the b0wl ----
  const bowl = dock.querySelector('.bowl');
  const open = (on) => {
    bowl.setAttribute('aria-expanded', String(on));
    document.body.classList.toggle('dock-open', on);
    if (on) { pile.hidden = false; requestAnimationFrame(() => pile.classList.add('on')); pile.querySelector('a').focus({ preventScroll: true }); }
    else { pile.classList.remove('on'); setTimeout(() => { if (!pile.classList.contains('on')) pile.hidden = true; }, reduce ? 0 : 320); }
  };
  bowl.addEventListener('click', () => open(bowl.getAttribute('aria-expanded') !== 'true'));
  pile.querySelector('.pile-x').addEventListener('click', () => { open(false); bowl.focus(); });
  pile.addEventListener('click', (e) => { if (e.target === pile || e.target.closest('a')) open(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pile.classList.contains('on')) { open(false); bowl.focus(); } });

  // ---- the tube: sm0ke level = how far down the page you are ----
  const fill = dock.querySelector('.fill'), bubbles = dock.querySelector('.bubbles');
  let lastY = scrollY, lastT = performance.now(), queued = false, bubbleAt = 0;
  const bubble = () => {
    const b = document.createElement('i');
    b.style.left = (8 + Math.random() * 84) + '%';
    b.style.setProperty('--s', (4 + Math.random() * 6) + 'px');
    bubbles.appendChild(b);
    setTimeout(() => b.remove(), 900);
  };
  const tick = () => {
    queued = false;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    fill.style.transform = `scaleX(${Math.min(1, Math.max(.04, scrollY / max))})`;
    const now = performance.now(), v = Math.abs(scrollY - lastY) / Math.max(16, now - lastT);
    // scrolling down tucks the labels away, scrolling up brings them back; the tube never leaves
    if (Math.abs(scrollY - lastY) > 6) dock.classList.toggle('tuck', scrollY > lastY && scrollY > 120);
    if (!reduce && v > 1.2 && now - bubbleAt > 70) { bubbleAt = now; bubble(); }
    lastY = scrollY; lastT = now;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
  addEventListener('resize', tick, { passive: true });
  tick();
})();

// the magnifying glass on the desktop top menu: links swell as the mouse gets close, like looking through a lens,
// and drop down out of the bar. Neighbours slide aside so nothing overlaps. Mouse only, wide screens only.
(() => {
  const nav = document.querySelector('header nav[aria-label="Main"]');
  if (!nav || matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const links = [...nav.querySelectorAll('a')];
  if (!links.length) return;
  nav.classList.add('lens');
  const MAX = 0.55, REACH = 130, DROP = 10;   // extra scale at the cursor, how far the lens reaches (px), how far it drops (px)
  let boxes = null, frame = 0, mx = 0;
  const measure = () => {
    // resting layout (offset* ignore transforms, so a half-finished swell can't throw the numbers off)
    boxes = links.map((a) => {
      const p = (a.offsetParent || document.body).getBoundingClientRect();
      return { cx: p.left + a.offsetLeft + a.offsetWidth / 2, w: a.offsetWidth, top: a.offsetTop };
    });
  };
  const paint = () => {
    frame = 0;
    if (!boxes) measure();
    const s = boxes.map((b) => { const d = Math.abs(mx - b.cx) / REACH; return d >= 1 ? 1 : 1 + MAX * (Math.cos(d * Math.PI) + 1) / 2; });
    const shift = boxes.map(() => 0);
    // push things outward from the cursor by half of each magnified neighbour's growth (same row only)
    boxes.forEach((b, i) => {
      const grow = (s[i] - 1) * b.w;
      boxes.forEach((o, j) => {
        if (j === i || Math.abs(o.top - b.top) > 4) return;
        if (o.cx < b.cx) shift[j] -= grow / 2; else shift[j] += grow / 2;
      });
    });
    // never shove the last link off the right edge
    let over = 0;
    boxes.forEach((b, i) => { over = Math.max(over, b.cx + shift[i] + (b.w * s[i]) / 2 - (innerWidth - 8)); });
    links.forEach((a, i) => {
      const k = s[i] - 1;
      a.classList.toggle('lensed', k > 0.02);
      a.style.transform = `translate(${(shift[i] - over).toFixed(1)}px, ${(k / MAX * DROP).toFixed(1)}px) scale(${s[i].toFixed(3)})`;
    });
  };
  nav.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; measure(); nav.classList.add('lensing'); });
  nav.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mx = e.clientX; if (!frame) frame = requestAnimationFrame(paint); });
  nav.addEventListener('pointerleave', () => {
    cancelAnimationFrame(frame); frame = 0; boxes = null;
    nav.classList.remove('lensing');
    links.forEach((a) => { a.style.transform = ''; a.classList.remove('lensed'); });
  });
  addEventListener('resize', () => { boxes = null; }, { passive: true });
  addEventListener('scroll', () => { boxes = null; }, { passive: true });
})();

// crew promos (js/promo.js) ride along with the dock, which every page except the comics loads
(() => {
  if (/\/(travel|comics)\//.test(location.pathname) || document.querySelector('script[src$="js/promo.js"]')) return;
  const base = document.documentElement.dataset.base || '';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'css/promo.css';
  document.head.appendChild(css);
  const s = document.createElement('script');
  s.src = base + 'js/promo.js';
  s.defer = true;
  document.head.appendChild(s);
  // "Get the fit" bundles (js/fit.js) on crew character pages
  if (/\/crew\/(?!match\/)[^/]+\//.test(location.pathname)) {
    const fc = document.createElement('link');
    fc.rel = 'stylesheet';
    fc.href = base + 'css/fit.css';
    document.head.appendChild(fc);
    const f = document.createElement('script');
    f.src = base + 'js/fit.js';
    f.defer = true;
    document.head.appendChild(f);
  }
})();

// the header effects (js/header.js): genie links, the living logo, a torn edge that's different on every page
(() => {
  if (document.querySelector('script[src$="js/header.js"]') || !document.querySelector('header.top, header.topbar')) return;
  const base = document.documentElement.dataset.base || '';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'css/header.css';
  document.head.appendChild(css);
  const s = document.createElement('script');
  s.src = base + 'js/header.js';
  s.defer = true;
  document.head.appendChild(s);
})();

// the pop-art finish (js/popfx.js): halftone dot shadows, outlines on text that doesn't stand out. Every page.
(() => {
  if (document.querySelector('script[src$="js/popfx.js"]')) return;
  const s = document.createElement('script');
  s.src = (document.documentElement.dataset.base || '') + 'js/popfx.js';
  s.defer = true;
  document.head.appendChild(s);
})();
