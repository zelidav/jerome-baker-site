/* Crew antics on the shopping pages. Every so often an animated crew member walks in and messes with a
   product on screen: grabs it and runs, slowly strokes the glass, tries it on, or grabs it and gets popped by
   Torch, who puts it back. Every 8-14s on the list; in an open piece or product, within a second of opening and again every 4-7s. Everyone gets a turn before anyone repeats.
   Needs js/anim-data.js + js/crewanim.js. Test hook: JBAntics.run('snatch' | 'stroke' | 'tryon' | 'bust'). */
(() => {
  const CA = window.JBCrewAnim;
  let saver = false;
  try { saver = localStorage.getItem('jb-lite') === '1'; } catch (e) { /* storage blocked */ }
  if (!CA || saver || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // one show at a time (same lock as js/crew.js): never during the dance, never on top of another bit
  const STAGE = window.JBStage = window.JBStage || (() => {
    const st = { who: null, until: 0,
      busy() { return document.documentElement.dataset.dancing === '1' || !!st.who || performance.now() < st.until; },
      claim(name) { if (st.busy()) return false; st.who = name; return true; },
      release(name, rest = 2500) { if (st.who === name) { st.who = null; st.until = performance.now() + rest; } } };
    addEventListener('jb:dance', (e) => { if (e.detail && e.detail.state === 'done') st.until = performance.now() + 4000; });
    return st;
  })();
  const { Actor, humanoids, wait, preload, cast } = CA;
  const base = document.documentElement.dataset.base || '';
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const rand = (a, b) => a + Math.random() * (b - a);

  // where the products are, list and detail, on the two shopping pages
  const PAGES = [
    { test: () => document.getElementById('bench'), list: '.tile:not([hidden]) .cut', dialog: '#bench', detail: '#bImg', stage: '.bench-stage', busy: () => document.documentElement.dataset.dancing || document.querySelector('#bHit.on') || document.querySelector('.bench-stage .actor') },
    { test: () => document.getElementById('pd'), list: '.pcard img.main', dialog: '#pd', detail: '#pdImg', stage: '.pd-big', busy: () => false },
  ];
  const P = PAGES.find((p) => p.test());
  if (!P) return;

  /* ---------------------------------------------------------------- sound (same switch as the glass bench) */
  const soundOn = () => { try { return localStorage.getItem('jb-glass-sound') !== 'off'; } catch (e) { return true; } };
  const sound = (name) => { if (soundOn()) CA.play(name); };

  /* ---------------------------------------------------------------- stage helpers */
  // the house curves (same as the rest of the site's motion): things picked up arrive fast and settle, things put back move evenly
  const EASE_OUT = 'cubic-bezier(.23,1,.32,1)', EASE_IO = 'cubic-bezier(.65,0,.35,1)';
  const layerIn = (host) => {
    let l = host.querySelector(':scope > .antics');
    if (!l) { l = document.createElement('div'); l.className = 'antics'; host.appendChild(l); }
    const page = host === document.body;
    l.classList.toggle('page', page);
    if (page) {
      // on the list it covers the window as it is now but is pinned to the page, so a scroll mid-bit carries the crew
      // along with the product they're messing with (a fixed layer left them floating in place)
      Object.assign(l.style, { top: '0px', left: '0px', width: innerWidth + 'px', height: innerHeight + 'px' });
      const r = l.getBoundingClientRect();
      Object.assign(l.style, { top: -r.top + 'px', left: -r.left + 'px' });
    }
    return l;
  };
  const box = (el, host) => {
    const r = el.getBoundingClientRect(), h = host === document.body ? { left: 0, top: 0 } : host.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height };
  };
  // the part of an image that's actually drawn, as fractions of it: glass cutouts are trimmed, but the shop's cutouts
  // are the full photo frame with the product in the middle, so without this the crew lined up on empty margin
  const opaque = new Map();
  const alphaBox = (src) => {
    if (!opaque.has(src)) opaque.set(src, new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        try {
          const k = 64 / Math.max(im.naturalWidth, im.naturalHeight), c = document.createElement('canvas');
          const w = (c.width = Math.max(1, Math.round(im.naturalWidth * k))), h = (c.height = Math.max(1, Math.round(im.naturalHeight * k)));
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(im, 0, 0, w, h);
          const d = g.getImageData(0, 0, w, h).data;
          let x0 = w, y0 = h, x1 = -1, y1 = -1;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          res(x1 < 0 ? [0, 0, 1, 1] : [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h]);
        } catch (e) { res([0, 0, 1, 1]); }
      };
      im.onerror = () => res([0, 0, 1, 1]);
      im.src = src;
    }));
    return opaque.get(src);
  };
  // where the product is: R is the image as drawn inside its element (object-fit, object-position), c the product
  // inside that. Everything (floor line, where they stand, what they carry) works off c.
  const geom = async (t, host) => {
    const f = await alphaBox(itemSrc(t));
    const b = box(t, host), cs = getComputedStyle(t), nw = t.naturalWidth, nh = t.naturalHeight;
    let R = b;
    if (nw && nh && cs.objectFit !== 'fill') {
      let s = cs.objectFit === 'cover' ? Math.max(b.w / nw, b.h / nh) : cs.objectFit === 'none' ? 1 : Math.min(b.w / nw, b.h / nh);
      if (cs.objectFit === 'scale-down') s = Math.min(1, s);
      const w = nw * s, h = nh * s;
      const [px, py] = cs.objectPosition.split(' ').map((v, i) => (v.endsWith('%') ? (parseFloat(v) / 100) * (i ? b.h - h : b.w - w) : parseFloat(v) || 0));
      R = { x: b.x + px, y: b.y + py, w, h };
    }
    return { R, f, c: { x: R.x + f[0] * R.w, y: R.y + f[1] * R.h, w: (f[2] - f[0]) * R.w, h: (f[3] - f[1]) * R.h } };
  };
  const say = (layer, actor, text, ms = 1800) => {
    const b = document.createElement('p');
    b.className = 'ant-say';
    b.textContent = text;
    layer.appendChild(b);
    const [w, h] = actor.size();
    b.style.transform = `translate(${actor.x - w * .2}px,${actor.feet - h - 50}px)`;
    // out quicker than it came in
    setTimeout(() => b.animate([{ opacity: 1 }, { opacity: 0, translate: '0 -6px' }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).finished.then(() => b.remove(), () => b.remove()), ms);
  };
  // merch photos are on white, so the crew carries the transparent cutout (assets/shop/cut/, made by
  // ~/code/jbsite-work/shopcut/cut.py). Glass tiles are already cutouts. No cutout = no antic on that item.
  const cutFor = (img) => {
    const src = img.currentSrc || img.src;
    // WooCommerce items are <id>_<n>.webp, the Shopify studio-store ones shp<id>_<n>.webp (no cutouts for those yet)
    const m = src.match(/assets\/shop\/((?:shp)?\d+)_\d+(?:_t)?\.webp/);
    if (!m) return Promise.resolve(src);
    // always the product shot (photo 0): the other photos are often a model wearing it, and nobody should snatch a person
    const url = base + 'assets/shop/cut/' + m[1] + '_0.webp';
    const im = new Image();
    im.src = url;
    return im.decode().then(() => url, () => { console.warn('antics: no cutout for', m[1], '- skipped'); return null; });
  };
  const itemSrc = (t) => t._cut || t.currentSrc || t.src;
  // how big the real thing is. Glass pieces carry their height in inches (js/glass-data.js); the rest is guessed
  // from the name or the shelf, and merch from its shop category.
  // Anything 30 in and up is a giant: heavier than the crew, taller than the crew, and nobody walks off with it.
  const idOf = (t) => {
    const tile = t.closest('[data-id],[data-slug]');
    if (tile) return tile.dataset.id || tile.dataset.slug;
    if (t.matches(P.detail)) { const m = location.hash.match(/#p=([^&]+)/); return m && decodeURIComponent(m[1]); }
    return null;
  };
  const pieceOf = (t) => {
    const g = window.JB_GLASS, id = idOf(t);
    return (g && id && g.pieces.find((x) => x.id === id)) || null;
  };
  // pieces with no height on file (studio store, Spirit Creatures, Keikis, everyday glass, kit)
  const guessIn = (p) => {
    const n = `${p.name || ''} ${p.shape || ''}`, m = n.match(/(\d{1,2})"/);
    if (m) return +m[1];
    if (/spirit creature/i.test(n)) return /large/i.test(n) ? 5 : 2.5;
    if (p.shelf === 'keiki' || /keiki/i.test(n)) return 8;
    if (/skeeter/i.test(n)) return 7;
    if (/clearboy|dipper|pendant/i.test(n)) return 4;
    if (p.shelf === 'kit') return 3;
    if (/steeze|beaker|straight/i.test(n)) return 12;
    return 10;
  };
  const MERCH = [[/T-Shirts|Polos|Hoodies|Pajamas/, 28], [/Hats/, 6], [/Bags/, 16], [/Sneakers/, 5], [/Flip Flops/, 10],
    [/Stickers|Gift Cards/, 4], [/Prints/, 16], [/Home/, 8]];
  const inchesOf = (t) => {
    const p = pieceOf(t);
    if (p) return Number(p.inches) || guessIn(p);
    const s = window.JBShop, id = idOf(t), item = s && id && s.items.find((x) => x.slug === id);
    const cats = item ? item.cats.join('|') : '';
    const hit = MERCH.find(([re]) => re.test(cats));
    return hit ? hit[1] : 10;
  };
  const heavy = (t) => { const p = pieceOf(t); return !!p && Number(p.inches) >= 30; };
  // One scale for everyone: a crew member is about a foot tall, so they come up to the neck of a 15 in Baker
  // Classic, tower over a 3 in jar and barely reach the bulb of a 58 in giant. When the photo is blown up past
  // what fits (a jar on the bench), they're as big as the room allows and the piece shrinks to its real size
  // in their hands.
  const CREW_IN = 12;
  const sizeFor = (t, c, host) => {
    const room = host === document.body ? innerHeight : host.clientHeight;
    return Math.round(Math.max(96, Math.min(room * .6, 460, (c.h * CREW_IN) / inchesOf(t))));
  };
  // how much to scale the product so it's its real size next to a crew member H px tall (within reason)
  const handK = (t, H, c) => Math.min(1.4 * H, Math.max(.2 * H, (H * inchesOf(t)) / CREW_IN)) / c.h;
  const sweat = (layer, a, n = 3) => {
    const [w, h] = a.size();
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i');
      d.className = 'ant-sweat';
      d.style.left = a.x + (Math.random() - .5) * w * .5 + 'px';
      d.style.top = a.feet - h * (.8 + Math.random() * .12) + 'px';
      layer.appendChild(d);
      d.animate([{ opacity: 0, translate: '0 0' }, { opacity: 1, offset: .2 }, { opacity: 0, translate: `${(Math.random() - .5) * 30}px 46px` }],
        { duration: 900, delay: i * 160, easing: 'ease-in', fill: 'forwards' }).finished.then(() => d.remove());
    }
  };
  // a copy of the product that the crew member can carry around. It keeps the size it was drawn at and only ever
  // moves and scales by transform (uniformly, so the art keeps its shape); g._b is where the product in it is now.
  const ghostAt = (g, c) => {
    const s = c.h / g._c0.h;
    return `translate(${c.x - g._f[0] * g._R0.w * s}px,${c.y - g._f[1] * g._R0.h * s}px) scale(${s})`;
  };
  const ghost = (layer, src, T) => {
    const g = document.createElement('img');
    g.className = 'ant-item';
    g.src = src;
    g.alt = '';
    g.decoding = 'sync';
    g._R0 = { w: T.R.w, h: T.R.h }; g._f = T.f; g._c0 = { ...T.c }; g._b = { ...T.c };
    Object.assign(g.style, { width: T.R.w + 'px', height: T.R.h + 'px', transform: ghostAt(g, T.c) });
    layer.appendChild(g);
    return g;
  };
  const fly = (g, c, ms, easing = EASE_IO) => {
    const a = g.animate([{ transform: ghostAt(g, g._b) }, { transform: ghostAt(g, c) }], { duration: ms, easing, fill: 'forwards' });
    return a.finished.catch(() => {}).then(() => { g.style.transform = ghostAt(g, c); g._b = { ...c }; a.cancel(); });
  };
  // sm0ke out of the mouth, sized to whoever's sm0king
  const puff = (layer, x, y, n, dir, H = 250) => {
    const k = Math.max(.5, Math.min(1.6, H / 250));
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'ant-puff';
      const s = (18 + Math.random() * 30) * k;
      Object.assign(p.style, { width: s + 'px', height: s + 'px', left: x - s / 2 + 'px', top: y - s / 2 + 'px' });
      layer.appendChild(p);
      p.animate([{ opacity: .9, scale: .4, translate: '0 0' }, { opacity: 0, scale: 2.6, translate: `${dir * (30 + Math.random() * 80) * k}px ${(-40 - Math.random() * 90) * k}px` }],
        { duration: 1400 + Math.random() * 900, delay: i * 70, easing: EASE_OUT, fill: 'forwards' }).finished.then(() => p.remove());
    }
  };
  const restore = (t) => {
    t.style.visibility = '';
    t.animate([{ scale: .4, opacity: 0 }, { scale: 1.08, opacity: 1 }, { scale: 1 }], { duration: 420, easing: 'ease-out' });
  };
  // the item over the actor's head (carry), or on it (try-on)
  // (held at the hands: a long piece sits a little way into the top of the pose, never down over the face)
  const overHead = (a, c, k) => { const [, h] = a.size(); const iw = c.w * k, ih = c.h * k; return { x: a.x - iw / 2, y: a.feet - h - ih + Math.min(ih * .3, h * .2), w: iw, h: ih }; };
  // run with the item overhead: the carry pose bobbing along, the item moving with them in the same animation
  const runCarry = (a, x, ms = 800, g) => a.travel(x, ms, {
    run: true, poses: ['carry'], bob: Math.max(3, a.H * .025), also: g ? [g] : [],
    done: (dx) => { if (g) { g._b = { ...g._b, x: g._b.x + dx }; g.style.transform = ghostAt(g, g._b); } },
  });

  /* ---------------------------------------------------------------- the bits */
  // each gets the product (t), where it's drawn (T: see geom) and the layer the crew plays on
  // where to stand next to it, kept on stage: a piece that fills the bench (a wide Spirit Creature) used to put
  // them off the edge, with whatever they picked up
  const onStage = (x, H, W) => Math.max(H * .3, Math.min(W - H * .3, x));
  const BITS = {
    // grabs it and runs
    async snatch(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host), floor = b.y + b.h, k = handK(t, H, b);
      const a = new Actor(layer, cast(['torch']), H);
      const fromLeft = b.x + b.w / 2 > W / 2;
      a.at(fromLeft ? -H * .5 : W + H * .5, floor);
      await a.walk(onStage(fromLeft ? b.x - H * .2 : b.x + b.w + H * .2, H, W), 1100);
      a.face(fromLeft).pose('reach');
      await wait(300);
      const g = ghost(layer, itemSrc(t), T);
      t.style.visibility = 'hidden';
      a.pose('carry');
      say(layer, a, pick(['Mine now.', 'Nobody saw that.', "It's for my cousin.", 'Five finger discount.']));
      await fly(g, overHead(a, b, k), 300, EASE_OUT);
      await runCarry(a, fromLeft ? W + H : -H, 800, g);
      a.remove(); g.remove();
      await wait(1100);
      restore(t);
    },
    // slowly, lovingly strokes the glass
    async stroke(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host), floor = b.y + b.h;
      const a = new Actor(layer, cast(), H);
      const left = b.x + b.w / 2 > W / 2;
      a.at(left ? -H * .5 : W + H * .5, floor);
      await a.walk(onStage(left ? b.x - H * .12 : b.x + b.w + H * .12, H, W), 1100);
      a.face(left);
      say(layer, a, pick(["She's beautiful.", 'Look at that fume.', 'Shh. We are having a moment.', 'Hand-blown. Like me.']), 2600);
      await a.loop('stroke1', 'stroke2', 8, 380);
      a.pose('pose');
      say(layer, a, pick(["I'll call you.", 'Same time tomorrow.', 'Nobody saw that.']), 1500);
      await wait(700);
      await a.walk(left ? -H : W + H, 1200);
      a.remove();
    },
    // tries it on
    async tryon(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host), floor = b.y + b.h, k = handK(t, H, b);
      const a = new Actor(layer, cast(), H);
      const fromLeft = b.x + b.w / 2 > W / 2;
      a.at(fromLeft ? -H * .5 : W + H * .5, floor);
      await a.walk(onStage(fromLeft ? b.x - H * .2 : b.x + b.w + H * .2, H, W), 1100);
      a.face(fromLeft).pose('reach');
      await wait(300);
      const g = ghost(layer, itemSrc(t), T);
      t.style.visibility = 'hidden';
      a.pose('pose');
      const [, h] = a.size();
      await fly(g, { x: a.x - b.w * k / 2, y: a.feet - h - b.h * k * .45, w: b.w * k, h: b.h * k }, 450, EASE_OUT);
      say(layer, a, pick(['How do I look?', 'Is this my color?', 'Ring me up.', 'It fits.']), 2000);
      await wait(2000);
      await fly(g, b, 420);
      g.remove();
      t.style.visibility = '';
      await a.walk(fromLeft ? -H : W + H, 1100);
      a.remove();
    },
    // grabs it, Torch pops him in the face and puts it back
    async bust(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host), floor = b.y + b.h, k = handK(t, H, b);
      const fromLeft = b.x + b.w / 2 > W / 2;
      const thief = new Actor(layer, cast(['torch']), H);
      const torch = new Actor(layer, 'torch', H * 1.05);
      thief.at(fromLeft ? -H * .5 : W + H * .5, floor);
      torch.at(fromLeft ? W + H : -H, floor);
      await thief.walk(onStage(fromLeft ? b.x - H * .2 : b.x + b.w + H * .2, H, W), 1000);
      thief.face(fromLeft).pose('reach');
      await wait(260);
      const g = ghost(layer, itemSrc(t), T);
      t.style.visibility = 'hidden';
      thief.pose('carry');
      await fly(g, overHead(thief, b, k), 280, EASE_OUT);
      // they meet in the middle of the thief's escape route
      const meet = fromLeft ? Math.min(W - H * .7, thief.x + H * 1.2) : Math.max(H * .7, thief.x - H * 1.2);
      await Promise.all([runCarry(thief, meet - (fromLeft ? H * .35 : -H * .35), 550, g), torch.walk(meet + (fromLeft ? H * .3 : -H * .3), 550, true)]);
      torch.face(!fromLeft).pose('punch');
      sound('punch');
      const pow = document.createElement('div');
      pow.className = 'ant-pow';
      pow.textContent = pick(['POW!', 'BONK!', 'WHAP!', 'SMACK!']);
      pow.style.transform = `translate(${meet - 50}px,${floor - H * .9}px)`;
      layer.appendChild(pow);
      thief.pose('dizzy');
      thief.el.animate([{ rotate: '0deg', translate: '0 0', opacity: 1 }, { rotate: `${fromLeft ? -540 : 540}deg`, translate: `${fromLeft ? -300 : 300}px ${-H * .4}px`, opacity: 0 }], { duration: 800, easing: EASE_OUT, fill: 'forwards' });
      say(layer, torch, pick(['Put. It. Back.', 'Not in my shop.', 'Pay for it like a person.']), 2000);
      await fly(g, b, 650);
      g.remove();
      t.style.visibility = '';
      await wait(800);
      pow.remove(); thief.remove();
      torch.pose('pose');
      await wait(500);
      await torch.walk(fromLeft ? W + H : -H, 1100);
      torch.remove();
    },
    // walks up and takes a rip off it: lighter, pull, a cloud, a deep cough (glass only)
    async sesh(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host), floor = b.y + b.h;
      const a = new Actor(layer, cast(), H);
      const left = b.x + b.w / 2 > W / 2;
      a.at(left ? -H * .5 : W + H * .5, floor);
      await a.walk(onStage(left ? b.x - H * .15 : b.x + b.w + H * .15, H, W), 1000);
      a.face(left).pose('lean');
      await wait(220);
      a.pose('hit');
      sound('lighter');
      await wait(500);
      sound('rip');
      t.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.25) saturate(1.3)' }, { filter: 'brightness(1)' }], { duration: 1600, easing: 'ease-in-out' });
      await wait(1600);
      CA.hush('rip');
      a.pose('exhale');
      puff(layer, ...a.mouth(), 7, left ? 1 : -1, H);
      await wait(650);
      sound('cough');
      for (let i = 0; i < 2; i++) { a.pose('cough'); a.shake(320, 1); puff(layer, ...a.mouth(), 3, left ? 1 : -1, H); await wait(380); }
      say(layer, a, pick(['*cough* worth it.', 'Who packed this??', 'Smooth. *hack*', 'I can see sounds.']), 1800);
      a.pose('dizzy');
      await wait(900);
      await a.walk(left ? -H : W + H, 1400);
      a.remove();
    },
    // two of them grab it at once and play tug of war till it snaps back where it was
    async tug(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host) * .9, floor = b.y + b.h;
      const l = new Actor(layer, cast(), H), r = new Actor(layer, cast([l.slug]), H);
      l.at(-H * .5, floor); r.at(W + H * .5, floor);
      await Promise.all([l.walk(onStage(b.x - H * .2, H, W), 900), r.walk(onStage(b.x + b.w + H * .2, H, W), 900)]);
      l.face(true).pose('reach'); r.face(false).pose('reach');
      say(layer, l, pick(['I saw it first.', 'Mine.', 'Let go.']), 1400);
      await wait(500);
      const g = ghost(layer, itemSrc(t), T);
      t.style.visibility = 'hidden';
      say(layer, r, pick(['Nope.', 'I called it.', 'Over my dead body.']), 1400);
      for (let i = 0; i < 6; i++) {
        const d = (i % 2 ? 1 : -1) * Math.min(26, b.w * .12);
        g.animate([{ translate: '0 0', rotate: '0deg' }, { translate: `${d}px 0`, rotate: `${d / 6}deg` }], { duration: 160, easing: 'ease-in-out', fill: 'forwards' });
        (i % 2 ? r : l).shake(160, 1);
        await wait(170);
      }
      g.remove();
      restore(t);
      l.pose('dizzy'); r.pose('dizzy');
      // both stagger back a step when it snaps loose (and stay there: no hop back before they walk off)
      await Promise.all([l.glide(l.x - H * .5, 300, EASE_OUT), r.glide(r.x + H * .5, 300, EASE_OUT), wait(700)]);
      await Promise.all([l.walk(-H, 1000), r.walk(W + H, 1000)]);
      l.remove(); r.remove();
    },
    // a giant: two of them try to lift it together. It comes up an inch, they strain, sweat, and set it back down.
    async teamlift(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host), floor = b.y + b.h;
      const l = new Actor(layer, cast(), H), r = new Actor(layer, cast([l.slug]), H);
      l.at(-H * .5, floor); r.at(W + H * .5, floor);
      await Promise.all([l.walk(onStage(b.x + b.w * .12 - H * .18, H, W), 1000), r.walk(onStage(b.x + b.w * .88 + H * .18, H, W), 1000)]);
      l.face(true).pose('reach'); r.face(false).pose('reach');
      say(layer, l, pick(['On three.', 'Lift with your legs.', 'Ready? Go.']), 1300);
      await wait(900);
      const g = ghost(layer, itemSrc(t), T);
      g.style.transformOrigin = `${(T.f[0] + T.f[2]) * 50}% ${T.f[3] * 100}%`; // tips on the bottom of the glass
      t.style.visibility = 'hidden';
      // hands on the glass (the carry pose holds its own prop over its head, so not that one)
      l.pose('reach'); r.pose('reach');
      // it barely leaves the ground, and it wobbles; how far is real: a few px against crew this size
      const lift = Math.max(3, H * .05);
      for (let i = 0; i < 5; i++) {
        const up = i % 2 ? lift * .4 : lift, tilt = (i % 2 ? -1 : 1) * 1.8;
        g.animate([{ translate: '0 0', rotate: '0deg' }, { translate: `0 ${-up}px`, rotate: `${tilt}deg` }], { duration: 300, fill: 'forwards', easing: 'ease-out' });
        l.shake(280, 1); r.shake(280, 1);
        if (i === 1) { sweat(layer, l); sweat(layer, r); say(layer, r, pick(['OOF.', 'Why is it so heavy?!', 'My back.', 'It weighs a ton.']), 1500); }
        await wait(320);
      }
      g.animate([{ translate: `0 ${-lift * .6}px` }, { translate: '0 0' }], { duration: 260, fill: 'forwards', easing: 'ease-in' });
      await wait(280);
      g.remove();
      t.style.visibility = '';
      t.animate([{ translate: '0 2px' }, { translate: '0 0' }], { duration: 160, easing: 'ease-out' });
      l.pose('dizzy'); r.pose('dizzy');
      say(layer, l, pick(["We'll get a dolly.", 'It lives here now.', 'Next time.']), 1600);
      await wait(1000);
      await Promise.all([l.walk(-H, 1100), r.walk(W + H, 1100)]);
      l.remove(); r.remove();
    },
    // a giant: one of them tips it and tries to walk it off, corner by corner. It goes a few inches and slides home.
    async tipwalk(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host), floor = b.y + b.h;
      const a = new Actor(layer, cast(), H);
      const fromLeft = b.x + b.w / 2 > W / 2;
      a.at(fromLeft ? -H * .5 : W + H * .5, floor);
      await a.walk(onStage(fromLeft ? b.x - H * .1 : b.x + b.w + H * .1, H, W), 1100);
      a.face(fromLeft).pose('reach');
      say(layer, a, pick(['Nobody look.', 'Just gonna borrow this.', 'Easy does it.']), 1400);
      await wait(600);
      const g = ghost(layer, itemSrc(t), T);
      g.style.transformOrigin = `${(T.f[0] + T.f[2]) * 50}% ${T.f[3] * 100}%`;
      t.style.visibility = 'hidden';
      const dir = fromLeft ? -1 : 1, stepPx = Math.min(12, b.w * .06);
      let dx = 0;
      for (let i = 0; i < 4; i++) {
        const tilt = (i % 2 ? 1 : -1) * 6;
        dx += dir * stepPx;
        g.animate([{ rotate: '0deg', translate: `${dx - dir * stepPx}px 0` }, { rotate: `${tilt}deg`, translate: `${dx}px 0`, offset: .5 }, { rotate: '0deg', translate: `${dx}px 0` }], { duration: 420, fill: 'forwards', easing: 'ease-in-out' });
        // they shuffle with it, step for step (this used to jump them over in one frame)
        a.shake(380, 1);
        if (i === 2) { sweat(layer, a, 4); say(layer, a, pick(['Heavier than it looks.', 'OOF.', 'Nope. Nope.']), 1500); }
        await Promise.all([a.glide(a.x + dir * stepPx, 420), wait(440)]);
      }
      a.pose('dizzy');
      await wait(400);
      // it slides back where it lives
      g.animate([{ translate: `${dx}px 0` }, { translate: '0 0' }], { duration: 500, fill: 'forwards', easing: 'ease-in-out' });
      await wait(520);
      g.remove();
      t.style.visibility = '';
      await a.walk(fromLeft ? -H : W + H, 1200);
      a.remove();
    },
    // gets one good look and passes out
    async faint(t, host, layer, W, T) {
      const b = T.c, H = sizeFor(t, b, host), floor = b.y + b.h;
      const a = new Actor(layer, cast(), H);
      const left = b.x + b.w / 2 > W / 2;
      a.at(left ? -H * .5 : W + H * .5, floor);
      await a.walk(onStage(left ? b.x - H * .25 : b.x + b.w + H * .25, H, W), 1000);
      a.face(left).pose('pose');
      say(layer, a, pick(['Is it... breathing?', 'Too beautiful.', 'Hold me.', 'I need to sit down.']), 1500);
      await wait(1300);
      a.pose('dizzy');
      await a.shake(300, 2);
      await a.el.animate([{ rotate: '0deg', opacity: 1 }, { rotate: `${left ? -88 : 88}deg`, opacity: 1, offset: .7 }, { rotate: `${left ? -88 : 88}deg`, opacity: 0 }], { duration: 1500, easing: 'ease-in', fill: 'forwards' }).finished;
      a.remove();
    },
  };
  // glass gets the sesh; everything gets the rest
  const WEIGHTS = [['snatch', 3], ['tryon', 3], ['bust', 2], ['stroke', 2], ['tug', 2], ['faint', 2], ...(P.list.includes('.tile') ? [['sesh', 4]] : [])];
  // a giant can't be pocketed, worn or run off with: it gets lifted (badly), tipped and walked (barely), admired,
  // sm0ked or fainted at
  const HEAVY = [['teamlift', 4], ['tipwalk', 3], ['stroke', 2], ['sesh', 3], ['faint', 2]];
  let lastBit = '';
  // jars, Spirit Creatures, Skeeters and kit aren't sm0ked (sm0ke:false from build_glass.py): no sesh on those
  const smokable = (t) => { const p = pieceOf(t); return !p || p.smoke !== false; };
  const choose = (t) => {
    const ok = !t || smokable(t);
    const ws = (t && heavy(t) ? HEAVY : WEIGHTS).filter(([k]) => k !== lastBit && (ok || k !== 'sesh'));
    let r = Math.random() * ws.reduce((s, [, w]) => s + w, 0);
    for (const [k, w] of ws) if ((r -= w) < 0) return (lastBit = k);
    return (lastBit = ws[0][0]);
  };

  /* ---------------------------------------------------------------- when */
  let running = false;
  const onScreen = (el) => {
    // mostly on screen is enough
    const r = el.getBoundingClientRect();
    const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 70);
    return r.width > 40 && vis > r.height * .75 && r.left >= 0 && r.right <= innerWidth && getComputedStyle(el).visibility !== 'hidden';
  };
  async function run(kind, where) {
    if (running || STAGE.busy()) return false;
    const dlg = document.querySelector(P.dialog);
    const detail = where === 'detail' || (where == null && dlg && dlg.open);
    let target, host;
    if (detail) {
      target = document.querySelector(P.detail);
      host = target && target.closest(P.stage);
    } else {
      target = pick([...document.querySelectorAll(P.list)].filter(onScreen));
      host = document.body;
    }
    if (!target || !host || !target.complete || !target.naturalWidth) return false;
    running = true; // held while the cutout loads so two bits can't start at once
    target._cut = await cutFor(target);
    if (!target._cut) { running = false; return false; }
    if (detail && (host.classList.contains('holo-live') || host.querySelector('.holo-live'))) { running = false; return false; } // the holo has the stage
    if (!STAGE.claim('antics')) { running = false; return false; }
    running = true;
    const layer = layerIn(host);
    const W = host === document.body ? innerWidth : host.clientWidth;
    // a forced light bit on a giant becomes a heavy one: nobody pockets 58 inches of glass
    if (kind && heavy(target) && !HEAVY.some(([k]) => k === kind)) kind = 'teamlift';
    if (kind === 'sesh' && !smokable(target)) kind = null; // forced sesh on something you can't sm0ke: let the crew pick another bit
    try { await BITS[kind || choose(target)](target, host, layer, W, await geom(target, host)); } catch (e) { target.style.visibility = ''; console.warn('antics', e); }
    // someone who went real mid-bit finishes before they're cleared away
    await Promise.all([...layer.children].map((el) => el._real).filter(Boolean));
    layer.replaceChildren();
    running = false;
    STAGE.release('antics');
    return true;
  }
  window.JBAntics = { run };

  // double-tap anywhere on the product while a crew member is on it and they go real (they're small targets)
  let tap = 0;
  addEventListener('pointerdown', (e) => {
    const stage = e.target.closest && e.target.closest(P.stage);
    const actor = stage && stage.querySelector('.antics .actor');
    if (!actor || !actor._actor) return;
    if (e.timeStamp - tap < 380) { tap = 0; actor._actor.real(); } else tap = e.timeStamp;
  });
  humanoids.slice(0, 2).forEach(preload);

  // on the list: regularly, a different crew member each time, only when the tab is open and nothing else is going on
  let next = performance.now() + rand(3000, 6000);
  setInterval(() => {
    const dlg = document.querySelector(P.dialog);
    if (document.hidden || running || (dlg && dlg.open) || document.body.classList.contains('dock-open') || performance.now() < next) return;
    run(null, 'list').then((ran) => { next = performance.now() + (ran ? rand(8000, 14000) : 2500); });
  }, 1000);
  // in the detail view: soon after it opens, then again and again while it stays open
  const dlg = document.querySelector(P.dialog);
  if (dlg) {
    let loop = 0;
    const again = (me, ms) => setTimeout(async () => {
      if (me !== loop || !dlg.open) return;
      const ran = !P.busy() && !document.hidden && await run(null, 'detail');
      again(me, ran ? rand(4000, 7000) : 1500);
    }, ms);
    // a giant may be dancing when it opens (js/dance.js): wait for it to claim the stage, then for it to finish
    const giantOpen = () => { const m = location.hash.match(/#p=([^&]+)/), g = window.JB_GLASS, p = m && g && g.pieces.find((x) => x.id === decodeURIComponent(m[1])); return !!(p && Number(p.inches) >= 30); };
    new MutationObserver(() => { loop++; if (dlg.open) again(loop, giantOpen() ? rand(3500, 4500) : rand(500, 1100)); })
      .observe(dlg, { attributes: true, attributeFilter: ['open'] });
  }
})();
