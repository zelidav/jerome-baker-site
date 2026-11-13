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
    ['The Story', 'story/', 'white', 'Since 1991.'],
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
  if (!nav.querySelector('a')) return;
  nav.classList.add('lens');
  const MAX = 0.4, REACH = 120, DROP = 8, GAP = 6;   // extra scale at the cursor, lens reach (px), drop (px), min space between links (px)
  // the link list is read fresh each time the mouse comes in: Contact and the social icons are added to the menu
  // after this runs (js/contact.js), and a list taken at load left them standing still while everything else moved
  let links = [], boxes = null, frame = 0, mx = 0, edge = 0;
  const measure = () => {
    links = [...nav.querySelectorAll('a')].filter((a) => a.offsetWidth);
    const nr = nav.getBoundingClientRect(); edge = nr.right + scrollX;   // the social icons sit just past the menu
    // resting layout from the page box (offset* ignore transforms, so a half-finished swell can't throw the numbers off)
    boxes = links.map((a) => {
      let x = 0, y = 0;
      for (let el = a; el; el = el.offsetParent) { x += el.offsetLeft; y += el.offsetTop; }
      return { l: x, w: a.offsetWidth, cy: y + a.offsetHeight / 2 };
    });
  };
  const paint = () => {
    frame = 0;
    if (!boxes) measure();
    const px = mx + scrollX;
    const s = boxes.map((b) => { const d = Math.abs(px - (b.l + b.w / 2)) / REACH; return d >= 1 ? 1 : 1 + MAX * (Math.cos(d * Math.PI) + 1) / 2; });
    // lay the row out again left to right at the magnified widths, keeping the row centred on where it was,
    // so every link moves with its neighbours and none can overlap another (buttons and icons included)
    const rows = [];
    boxes.forEach((b, i) => { let r = rows.find((q) => Math.abs(q.cy - b.cy) < 24); if (!r) rows.push(r = { cy: b.cy, ix: [] }); r.ix.push(i); });
    const tx = boxes.map(() => 0);
    rows.forEach((r) => {
      r.ix.sort((a, b) => boxes[a].l - boxes[b].l);
      const first = boxes[r.ix[0]], last = boxes[r.ix[r.ix.length - 1]];
      const restMid = (first.l + last.l + last.w) / 2;
      let x = 0; const pos = [];
      r.ix.forEach((i, k) => {
        const b = boxes[i], nb = k ? boxes[r.ix[k - 1]] : null;
        if (nb) x += Math.max(GAP, b.l - (nb.l + nb.w));   // keep the original spacing (at least GAP)
        pos.push(x); x += b.w * s[i];
      });
      const off = restMid - x / 2 - first.l;
      r.ix.forEach((i, k) => { const b = boxes[i]; tx[i] = first.l + off + pos[k] + (b.w * s[i] - b.w) / 2 - b.l; });
    });
    // never past the end of the menu, into the social icons
    let over = 0;
    boxes.forEach((b, i) => { over = Math.max(over, b.l + tx[i] + (b.w * (s[i] + 1)) / 2 - edge); });
    links.forEach((a, i) => {
      const k = s[i] - 1;
      a.classList.toggle('lensed', k > 0.02);
      a.style.transform = `translate(${(tx[i] - over).toFixed(1)}px, ${(k / MAX * DROP).toFixed(1)}px) scale(${s[i].toFixed(3)})`;
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

// power saving + the ?perf=1 meter (js/perf.js), every page with the dock
(() => {
  if (document.querySelector('script[src$="js/perf.js"]')) return;
  const s = document.createElement('script');
  s.src = (document.documentElement.dataset.base || '') + 'js/perf.js';
  s.defer = true;
  document.head.appendChild(s);
})();

// after the first screen is drawn and the browser is idle (the promos, the fit bundles, nothing the first paint needs)
const jbIdle = (go) => {
  const run = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 300));
  document.readyState === 'complete' ? run() : addEventListener('load', run, { once: true });
};

// crew promos (js/promo.js) ride along with the dock, which every page except the comics loads
jbIdle(() => {
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
});

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

// Lite mode (js/litemode.js): one switch for the heavy effects, and an offer when the page runs slow. Every page.
(() => {
  if (document.querySelector('script[src$="js/litemode.js"]')) return;
  const s = document.createElement('script');
  s.src = (document.documentElement.dataset.base || '') + 'js/litemode.js';
  s.defer = true;
  document.head.appendChild(s);
})();

// the drop-down menus on the desktop top bar (js/megamenu.js, css/megamenu.css)
(() => {
  if (document.querySelector('script[src$="js/megamenu.js"]') || !document.querySelector('header.top, header.topbar')) return;
  const base = document.documentElement.dataset.base || '';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'css/megamenu.css';
  document.head.appendChild(css);
  const s = document.createElement('script');
  s.src = base + 'js/megamenu.js';
  s.defer = true;
  document.head.appendChild(s);
})();

// Reach us (js/contact.js, css/contact.css): Contact + socials in the menu, the menu bar that tucks away while you
// scroll down, back to top, and the phone / inbox / customer-service form at the top of every footer. Every page.
(() => {
  if (document.querySelector('script[src$="js/contact.js"]')) return;
  const s = document.createElement('script');
  s.src = (document.documentElement.dataset.base || '') + 'js/contact.js';
  s.defer = true;
  document.head.appendChild(s);
})();

// Collage parallax (js/parallax.js): the box-art collage between the folds drifts slower than the page. Every page.
(() => {
  if (document.querySelector('script[src$="js/parallax.js"]')) return;
  const s = document.createElement('script');
  s.src = (document.documentElement.dataset.base || '') + 'js/parallax.js';
  s.defer = true;
  document.head.appendChild(s);
})();
