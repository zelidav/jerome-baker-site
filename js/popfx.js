/* Pop-art finish, every page (loaded by js/dock.js):
   1. Halftone shadows. The hard black offset box-shadows become comic-book dot-matrix shadows: an SVG filter
      takes the element's own shape, shifts it by the same offset and fills it with black dots. The elements and
      their layout don't change, only how the shadow is drawn.
   2. Outlined text where it doesn't stand out. Text whose color is too close to what's behind it (contrast under
      3:1), or that sits straight on a busy picture (the collage), gets an outline in black or white, whichever
      contrasts with the text. */
(() => {
  if (window.JBPopFx) return;
  window.JBPopFx = true;
  const NS = 'http://www.w3.org/2000/svg';
  const DOT = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6"><circle cx="3" cy="3" r="1.55" fill="#0A0A0A"/></svg>');
  const DOT_FINE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><circle cx="2" cy="2" r="1" fill="#0A0A0A"/></svg>');
  let defs = null;
  const made = new Set();
  const filterFor = (dx, dy) => {
    const id = `jb-ht-${dx}-${dy}`;
    if (made.has(id)) return id;
    if (!defs) {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      defs = document.createElementNS(NS, 'defs');
      svg.append(defs);
      document.body.append(svg);
    }
    const small = Math.max(dx, dy) <= 4, tile = small ? 4 : 6;
    const f = document.createElementNS(NS, 'filter');
    f.id = id;
    f.setAttribute('x', '-5%'); f.setAttribute('y', '-5%'); f.setAttribute('width', '125%'); f.setAttribute('height', '125%');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.innerHTML = `<feImage href="${small ? DOT_FINE : DOT}" x="0" y="0" width="${tile}" height="${tile}" result="dot"/>` +
      `<feTile in="dot" result="dots"/>` +
      `<feOffset in="SourceAlpha" dx="${dx}" dy="${dy}" result="off"/>` +
      `<feComposite in="dots" in2="off" operator="in" result="shadow"/>` +
      `<feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    defs.append(f);
    made.add(id);
    return id;
  };
  window.JBHalftone = filterFor; // the header tear uses it too

  const INK = /rgb\(10, 10, 10\) (-?\d+(?:\.\d+)?)px (-?\d+(?:\.\d+)?)px 0px(?: 0px)?$/;
  // Phones and tablets (and Safari) don't get the live SVG filter: it is redrawn on every scroll and canvas frame,
  // which costs a lot and makes pinned buttons flash. They get the same dots as a plain painted layer instead: a
  // ::before behind the element, offset like the shadow, tiled with the dot image and cut out where the element
  // sits, so it never repaints on its own. Elements that already use ::before keep a solid shadow.
  const touch = matchMedia('(pointer: coarse)').matches || /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);
  const dotsLayer = (el, cs, dx, dy) => {
    if (getComputedStyle(el, '::before').content !== 'none') return false;
    if (cs.position === 'static') {
      // a static box only becomes the dots' anchor when that can't move anything inside it
      if (el.children.length && !/^(A|BUTTON|LABEL)$/.test(el.tagName)) return false;
      el.style.position = 'relative';
    }
    el.classList.add('jb-htd');
    el.style.setProperty('--hx', dx + 'px');
    el.style.setProperty('--hy', dy + 'px');
    el.style.setProperty('--ht', `url("${Math.max(Math.abs(dx), Math.abs(dy)) <= 4 ? DOT_FINE : DOT}")`);
    el.style.setProperty('--hs', Math.max(Math.abs(dx), Math.abs(dy)) <= 4 ? '4px' : '6px');
    return true;
  };
  const halftone = (el) => {
    if (el.dataset.ht) return;
    const cs = getComputedStyle(el);
    if (cs.boxShadow === 'none' || (cs.boxShadow.match(/rgb/g) || []).length > 1 || cs.boxShadow.includes('inset')) return;
    const m = cs.boxShadow.match(INK);
    if (!m) return;
    const dx = Math.round(+m[1]), dy = Math.round(+m[2]);
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 3) return; // tiny ones stay crisp
    el.dataset.ht = '1';
    if (touch) { if (dotsLayer(el, cs, dx, dy)) el.style.boxShadow = 'none'; return; }
    el.style.boxShadow = 'none';
    const f = `url(#${filterFor(dx, dy)})`;
    el.style.filter = cs.filter && cs.filter !== 'none' ? cs.filter + ' ' + f : f;
  };

  // ---------- contrast ----------
  const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const behind = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none' && /url\(/.test(cs.backgroundImage)) return 'busy';
      if (e.classList.contains('boxbg') || e.querySelector(':scope > .wash')) return 'busy'; // the box-art collage (drawn in ::before)
      const c = rgb(cs.backgroundColor);
      if (c.length >= 3 && (c.length === 3 || c[3] > .6)) return c;
    }
    return rgb(getComputedStyle(document.body).backgroundColor);
  };
  const SKIP = 'script,style,svg,canvas,video,img,input,textarea,select,option,header nav,.holo-stage,.jb-ol';
  const outline = (el) => {
    if (el.dataset.ol || el.closest(SKIP)) return;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0 || (cs.webkitTextStrokeWidth && cs.webkitTextStrokeWidth !== '0px')) return;
    const fg = rgb(cs.color);
    if (fg.length < 3) return;
    const bg = behind(el);
    if (bg !== 'busy' && ratio(fg, bg) >= 3) return;
    el.dataset.ol = '1';
    el.classList.add('jb-ol');
    el.style.setProperty('--olc', lum(fg) > .35 ? '#0A0A0A' : '#FFFFFF');
    if (parseFloat(cs.fontSize) >= 28) el.classList.add('jb-ol-big');
  };

  const css = document.createElement('style');
  css.textContent = `
.jb-ol{--o:1.5px;text-shadow:calc(var(--o)*-1) calc(var(--o)*-1) 0 var(--olc),var(--o) calc(var(--o)*-1) 0 var(--olc),calc(var(--o)*-1) var(--o) 0 var(--olc),var(--o) var(--o) 0 var(--olc),0 calc(var(--o)*-1) 0 var(--olc),0 var(--o) 0 var(--olc),calc(var(--o)*-1) 0 0 var(--olc),var(--o) 0 0 var(--olc)}
.jb-ol-big{--o:3px}
.jb-htd{isolation:isolate}
.jb-htd::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;translate:var(--hx) var(--hy);background:var(--ht) 0 0/var(--hs) var(--hs) repeat;
  -webkit-mask:linear-gradient(#000 0 0) 0 0/100% 100% no-repeat,linear-gradient(#000 0 0) calc(-1 * var(--hx)) calc(-1 * var(--hy))/100% 100% no-repeat;-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) 0 0/100% 100% no-repeat exclude,linear-gradient(#000 0 0) calc(-1 * var(--hx)) calc(-1 * var(--hy))/100% 100% no-repeat}
.lxw{display:inline}
/* section rules like ".chips a span" or ".ticker span" must not restyle the swap wrappers */
:is(.lxw,.lx){padding:0!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important;opacity:1!important;filter:none!important;color:inherit!important;font:inherit!important;letter-spacing:inherit!important;text-decoration:inherit}
.lx{display:inline-block;rotate:-6deg;translate:0 -.03em;margin:0;letter-spacing:inherit}
.lx:nth-of-type(2n){rotate:5deg}`;
  document.head.append(css);

  // ---------- swapped letters (tools/scrub.py writes b0ng, p!pe, sm0ke...): the swapped character gets a little
  // graffiti tilt so it reads as lettering, not a typo
  const SWAP = /(?:b0ng|p!pe|sm0k|tr!pp|w33d|c@nnabis|m@rijuana|st0n|j0int|bl\*nt|n@rcotic|psych3delic|mu\$hroom|@cid|t0k|b@ked|h@sh|b0wl|r0lling|h!gh|k\*sh|spl!ff|d@b|v@p|3dible|d!spensar|dr\*g|d0pe|g@nja|\$tash)/i;
  const SWAPS = new RegExp(SWAP.source, 'gi');
  const letters = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (SWAP.test(n.nodeValue) && !n.parentElement.closest('script,style,textarea,input,.lx,svg') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const hits = [];
    while (w.nextNode()) hits.push(w.currentNode);
    for (const n of hits) {
      const frag = document.createDocumentFragment();
      let last = 0;
      n.nodeValue.replace(SWAPS, (m, at) => {
        frag.append(n.nodeValue.slice(last, at));
        for (const ch of m) {
          if ('0!@3$*'.includes(ch)) { const sp = document.createElement('span'); sp.className = 'lx'; sp.textContent = ch; frag.append(sp); } else frag.append(ch);
        }
        last = at + m.length;
        return m;
      });
      frag.append(n.nodeValue.slice(last));
      // one wrapper per text run, so a flex or grid parent (the glass shelf tabs) still sees one word, not three
      // items with gaps between them ("Giant b 0 ngs")
      const run = document.createElement('span');
      run.className = 'lxw';
      run.append(frag);
      n.replaceWith(run);
    }
  };

  const scan = (root) => {
    if (root.nodeType === 1) letters(root);
    const all = root.querySelectorAll ? [root, ...root.querySelectorAll('*')] : [];
    for (const el of all) {
      if (!(el instanceof HTMLElement)) continue;
      halftone(el);
      outline(el);
    }
  };
  const idle = (f) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 50));
  const run = () => idle(() => scan(document.body));
  if (document.readyState === 'complete') run();
  else addEventListener('load', run, { once: true });
  // the floating crew, effect layers and the holo canvas change all the time and have nothing to finish
  const QUIET = '.crew-layer,.fx-layer,.holo-stage,.bubble,.jbz';
  // pages build parts of themselves later (shop grid, crew wall, dialogs): pick those up as they come
  let queue = new Set(), t = 0;
  new MutationObserver((ms) => {
    for (const m of ms) m.addedNodes.forEach((n) => { if (n.nodeType === 1 && !n.closest(QUIET)) queue.add(n); });
    if (!t && queue.size) t = setTimeout(() => { t = 0; const q = queue; queue = new Set(); idle(() => q.forEach((n) => n.isConnected && scan(n))); }, 250);
  }).observe(document.body, { childList: true, subtree: true });
})();
