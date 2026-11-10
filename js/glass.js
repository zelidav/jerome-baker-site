/* The Glass showcase: shelves from js/glass-data.js, sm0ke off any piece you hover, and the bench,
   where you hold a piece down to fill it with sm0ke and let it go. */
(() => {
  const D = window.JB_GLASS;
  if (!D) return;
  const $ = (s, r = document) => r.querySelector(s);
  const img = (p, thumb) => `../assets/glass/${p.id}${thumb ? '_t' : ''}.webp`;
  const money = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const byId = Object.fromEntries(D.pieces.map((p) => [p.id, p]));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------------------------------------------------------- sm0ke */
  // soft, lumpy puffs, drawn once and stamped many times
  const puffs = [0, 1, 2, 3].map((k) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    for (let i = 0; i < 7; i++) {
      const x = 64 + (Math.random() - .5) * 46, y = 64 + (Math.random() - .5) * 46, r = 22 + Math.random() * 30;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const tint = k % 2 ? '238,232,255' : '255,255,255';
      grd.addColorStop(0, `rgba(${tint},.42)`);
      grd.addColorStop(1, `rgba(${tint},0)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    }
    return c;
  });

  // the same puffs in a cool grey, so sm0ke still reads on the white store tiles
  const grays = puffs.map((src) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = 'rgb(120,124,150)';
    g.fillRect(0, 0, 128, 128);
    return c;
  });

  class Smoke {
    // world coords: page sm0ke lives in document coords and scrolls; bench sm0ke is local to its canvas
    constructor(canvas, { scrolls, cap }) {
      Object.assign(this, { canvas, scrolls, cap, ctx: canvas.getContext('2d'), ps: [], emitters: new Map(), raf: 0, last: 0 });
      this.fit();
      addEventListener('resize', () => this.fit());
    }
    fit() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const r = this.canvas.getBoundingClientRect();
      this.canvas.width = Math.max(1, r.width * dpr);
      this.canvas.height = Math.max(1, r.height * dpr);
      this.dpr = dpr;
    }
    puff(x, y, o = {}) {
      if (this.ps.length >= this.cap) this.ps.shift();
      const big = o.big || 1;
      this.ps.push({
        x: x + (Math.random() - .5) * (o.spread || 6), y, seed: Math.random() * 6.28,
        vx: (Math.random() - .5) * .25 * big, vy: -(o.vy || .55) - Math.random() * .5,
        s: (o.size || 14) * (0.7 + Math.random() * .6), gs: (o.grow || .55) * big,
        a: (o.alpha || .5) * (0.7 + Math.random() * .5), t: 0, life: (o.life || 150) * (0.8 + Math.random() * .4),
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * .02, img: (o.gray ? grays : puffs)[(Math.random() * 4) | 0],
      });
      this.go();
    }
    burst(x, y, n, big = 2.2) {
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          this.puff(x, y, { big, spread: 22, vy: 1.4 + Math.random() * 2.2, size: 22, grow: .75, alpha: .5, life: 230 });
          const q = this.ps[this.ps.length - 1];
          q.vx = (Math.random() - .5) * 2.4 * big;  // a plume that opens up, not one ball
        }, i * 14);
      }
    }
    go() {
      if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.frame(t)); }
    }
    frame(now) {
      const dt = Math.min(3, (now - this.last) / 16.7);
      this.last = now;
      for (const [, e] of this.emitters) {
        e.acc += e.rate * dt;
        while (e.acc >= 1) {
          e.acc -= 1;
          const pt = e.at();
          if (pt) this.puff(pt[0], pt[1], e.o);
        }
      }
      const { ctx, dpr } = this;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const oy = this.scrolls ? scrollY : 0;
      this.ps = this.ps.filter((p) => (p.t += dt) < p.life);
      for (const p of this.ps) {
        p.vx += Math.sin(p.t * .05 + p.seed) * .012 * dt;
        p.vy *= 1 - .004 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.s += p.gs * dt; p.rot += p.vr * dt;
        const k = p.t / p.life;
        ctx.globalAlpha = p.a * Math.min(1, k * 6) * (1 - k) * (1 - k);
        ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, (p.y - oy) * dpr);
        ctx.rotate(p.rot);
        ctx.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s);
      }
      this.raf = this.ps.length || this.emitters.size ? requestAnimationFrame((t) => this.frame(t)) : 0;
      if (!this.raf) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    on(key, at, rate, o) { this.emitters.set(key, { at, rate, o, acc: 0 }); this.go(); }
    off(key) { this.emitters.delete(key); }
  }

  const page = new Smoke($('#smoke'), { scrolls: true, cap: 320 });
  // where the sm0ke leaves a piece: its mouthpiece, read off the cutout at build time
  const mouthOf = (el, p) => () => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return null;
    return [r.left + p.mouth[0] * r.width, r.top + p.mouth[1] * r.height + scrollY];
  };
  const wisp = { size: 16, grow: .6, alpha: .62, vy: .7, life: 170 };

  /* ---------------------------------------------------------------- the store */
  const HOST = 'https://jbcustomer.cannacrypted.com';
  // one smooth gradient per series, from the brand colors
  // Sasha's band colors (red, blue, green, yellow, orange), each a gradient within its own hue, under his JB pattern
  const BANDS = {
    giant: 'linear-gradient(125deg,#8E1028 0%,#DA2342 55%,#FF5A6E 100%)',
    le: 'linear-gradient(125deg,#141F5E 0%,#2A3B8E 55%,#4F67D6 100%)',
    og: 'linear-gradient(125deg,#036650 0%,#05B48F 55%,#3FE0B8 100%)',
    second: 'linear-gradient(125deg,#F2C200 0%,#FFF100 55%,#FFF86A 100%)',
    daily: 'linear-gradient(125deg,#B23A06 0%,#F06A2A 55%,#FF9A52 100%)',
    studio: 'linear-gradient(125deg,#8E1028 0%,#DA2342 55%,#FF5A6E 100%)',
    creatures: 'linear-gradient(125deg,#036650 0%,#05B48F 55%,#3FE0B8 100%)',
    kit: 'linear-gradient(125deg,#141F5E 0%,#2A3B8E 55%,#4F67D6 100%)',
  };
  const LIGHT_BANDS = new Set(['second']); // dark type on the yellow band
  const sold = (p) => p.status !== 'available';
  const tagOf = (p) => (p.status === 'sold' ? 'Sold' : p.status === 'collected' ? 'In a collection' : '');
  const aisles = $('#aisles');
  const tile = (p, feature) => {
    const sub = [p.series === 'Limited Edition' || p.series === 'Original Series' || p.series === 'Giant B0ng Series' ? p.shape : p.series, p.inches && `${p.inches} in`].filter(Boolean).join(', ');
    return `<button type="button" class="tile${feature ? ' feature' : ''}${sold(p) ? ' out' : ''}${p.w > p.h * .8 ? ' wide' : ''}" data-id="${p.id}" aria-label="${esc(p.name)}, ${sold(p) ? tagOf(p) : money(p.price)}">`
      + `<span class="frame">${p.standard && !p.edition && sold(p) ? '' : `<span class="pill">${esc(p.edition || (p.shop || p.standard ? 'In stock' : '1 of 1'))}</span>`}${sold(p) ? `<span class="pill gone">${tagOf(p)}</span>` : ''}`
      + `<img class="cut" src="${img(p, !feature)}" alt="" loading="lazy" decoding="async"></span>`
      + `<span class="t-name">${esc(p.name)}</span><span class="t-sub">${esc(sub)}</span>`
      + `<span class="t-price">${sold(p) ? `<s>${money(p.price)}</s>` : money(p.price)}</span></button>`;
  };
  aisles.innerHTML = D.shelves.map((s) => {
    const ps = D.pieces.filter((p) => p.shelf === s.key);
    return `<section class="aisle" id="s-${s.key}" data-k="${s.key}" aria-labelledby="h-${s.key}">`
      + `<div class="band${LIGHT_BANDS.has(s.key) ? ' light' : ''}" style="--g:${BANDS[s.key]}"><div class="band-in"><h2 id="h-${s.key}">${esc(s.title)}</h2><p>${esc(s.line)}<span class="ct">${ps.length} pieces</span></p></div></div>`
      + `<div class="grid">${ps.map((p, i) => tile(p, s.key === 'giant' && i === 0)).join('')}</div></section>`;
  }).join('');

  const chips = $('#shelfChips');
  const renderChips = () => {
    chips.innerHTML = D.shelves.map((s) => {
      const n = aisles.querySelectorAll(`#s-${s.key} .tile:not([hidden])`).length;
      return n ? `<a href="#s-${s.key}">${esc(s.title)}<span>${n}</span></a>` : '';
    }).join('');
  };

  // filters
  let price = 'all';
  const only = $('#onlyAvail');
  const apply = () => {
    const [lo, hi] = price === 'all' ? [0, Infinity] : price.split('-').map((v, i) => (v === '' ? (i ? Infinity : 0) : Number(v)));
    let shown = 0;
    aisles.querySelectorAll('.tile').forEach((el) => {
      const p = byId[el.dataset.id];
      const ok = p.price >= lo && p.price < hi && (!only.checked || p.status === 'available');
      el.hidden = !ok;
      shown += ok;
    });
    aisles.querySelectorAll('.aisle').forEach((a) => { a.hidden = !a.querySelector('.tile:not([hidden])'); });
    $('#empty').hidden = shown > 0;
    renderChips();
  };
  $('#priceSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    price = b.dataset.p;
    $('#priceSeg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    apply();
  });
  only.addEventListener('change', apply);
  $('#resetFilters').addEventListener('click', () => {
    only.checked = false;
    $('#priceSeg button[data-p=all]').click();
  });
  apply();

  // hover: sm0ke off the mouthpiece; rest on it a moment and the studio photo fades in
  const light = (el, on) => {
    el.classList.toggle('lit', on);
    clearTimeout(el._flip);
    if (!on) el.classList.remove('flip');
    if (calm) return;
    if (on) page.on(el, mouthOf(el.querySelector('.cut'), byId[el.dataset.id]), .5, { ...wisp, gray: true });
    else page.off(el);
  };
  const flip = (el) => {
    let ph = el.querySelector('.photo');
    if (!ph) {
      ph = document.createElement('img');
      ph.className = 'photo'; ph.alt = ''; ph.decoding = 'async';
      const pp = byId[el.dataset.id];
      ph.src = pp.flip ? `../assets/glass/${pp.flip}` : pp.shop ? (pp.photos[0] || '').replace(/width=\d+/, 'width=800') : `${HOST}/piece/${el.dataset.id}/image.jpg`;
      el.querySelector('.frame').appendChild(ph);
    }
    el._flip = setTimeout(() => { if (el.classList.contains('lit')) { page.off(el); el.classList.add('flip'); } }, 1600);
  };
  if (coarse) {
    const io = new IntersectionObserver((es) => es.forEach((e) => light(e.target, e.isIntersecting)), { rootMargin: '-44% 0px -44% 0px' });
    aisles.querySelectorAll('.tile').forEach((el) => io.observe(el));
  } else {
    aisles.addEventListener('pointerover', (e) => { const el = e.target.closest('.tile'); if (el && !el.classList.contains('lit')) { light(el, true); flip(el); } });
    aisles.addEventListener('pointerout', (e) => { const el = e.target.closest('.tile'); if (el && !el.contains(e.relatedTarget)) light(el, false); });
  }
  aisles.addEventListener('focusin', (e) => { const el = e.target.closest('.tile'); if (el) light(el, true); });
  aisles.addEventListener('focusout', (e) => { const el = e.target.closest('.tile'); if (el) light(el, false); });
  aisles.addEventListener('click', (e) => { const el = e.target.closest('.tile'); if (el) open(el.dataset.id); });

  // zoom (from the bench): the full-resolution cutout first, then the original photos
  const photosOf = (p) => [
    { src: `../assets/glass/${p.id}_z.webp`, w: p.zw, h: p.zh, alt: `${p.name}, close up` },
    ...(p.photos || (p.shop ? [] : [`${HOST}/piece/${p.id}/image.jpg`])).map((ph, i) => typeof ph === 'string'
      ? { src: ph, alt: `${p.name}, photo ${i + 2}` }
      : { src: `../assets/glass/${ph.src}`, thumb: `../assets/glass/${ph.src.replace(/\.webp$/, '_t.webp')}`, w: ph.w, h: ph.h, alt: `${p.name}: ${ph.label}`, label: ph.label }),
  ];
  const zoom = (p, at, index = 0) => window.JBZoom && JBZoom.open({ photos: photosOf(p), at, index });

  const visible = () => [...aisles.querySelectorAll('.tile:not([hidden])')].map((el) => el.dataset.id);
  new IntersectionObserver(([e]) => document.body.classList.toggle('in-shop', e.isIntersecting), { rootMargin: '-50% 0px -50% 0px' }).observe(aisles);

  if (coarse) $('#heroHint').textContent = 'Scroll and each piece lights up as it passes. Tap Take a hit and hold it down.';

  /* ---------------------------------------------------------------- hero */
  const HERO = byId['JBD-30A28BA0570D'] || D.pieces[0];
  const heroImg = $('#heroPiece img');
  heroImg.src = img(HERO);
  $('#heroTag').innerHTML = `<a class="tag" href="#p=${HERO.id}"><b>${esc(HERO.name)}</b><small>${esc(HERO.series)}${HERO.inches ? `, ${HERO.inches} in` : ''}, ${esc(HERO.edition || '1 of 1')}</small><span class="pr">${money(HERO.price)}</span><span class="go">See it up close</span></a>`;
  $('#heroPiece').addEventListener('click', () => open(HERO.id));
  $('#heroHit').addEventListener('click', () => { open(HERO.id); $('#bHit').focus(); $('#bHit').classList.add('nudge'); });
  if (!calm) {
    // the one thing on the page that moves on its own
    const heroAt = mouthOf(heroImg, HERO);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? page.on('hero', heroAt, .32, { ...wisp, size: 16 }) : page.off('hero')));
    io.observe(heroImg);
  }

  /* ---------------------------------------------------------------- the bench */
  const bench = $('#bench');
  const bImg = $('#bImg'), bFill = $('#bFill'), bPiece = $('#bPiece'), hit = $('#bHit');
  const bSmoke = new Smoke($('#bSmoke'), { scrolls: false, cap: 900 });
  let cur = null;
  const MODELS = {
    'JBD-595E91DF67DE': 'baker', 'JBD-CCB51FA365DB': 'northern-lights', 'JBD-98EE782454AB': 'jaws',
    'JBD-9E40404C237F': 'barfly', 'JBD-C2455D3C39C4': 'bubble-hash', 'JBD-6B2164673608': 'candyman',
    'JBD-C256C7355BC3': 'captain-ahab', 'JBD-3B07BA3340B4': 'coney-island', 'JBD-C03E08E3D935': 'flecko-the-gecko',
    'JBD-41B34E1C6BD9': 'jeremiahs-cousin', 'JBD-D292E97DB854': 'knuckle-sandwich', 'JBD-F43C642DA53F': 'lbd-logo-millie',
    'JBD-A3185688FDEB': 'ol-blue-eyes',
    'JBD-36BBE0335F82': 'liberace', 'JBD-C97DB8320C0A': 'mavericks', 'JBD-2C9B95C3C2C8': 'merry-prankster',
    'JBD-A04F8D029F47': 'miss-cleo', 'JBD-6C081ECE930D': 'miss-havisham', 'JBD-5BE3DA25CD0F': 'nazarre',
    'JBD-BDDF76BC90DD': 'norma-desmond', 'JBD-C46FC4F07E9B': 'orange-sunshine', 'JBD-E96E6DA62E2D': 'patient-zero',
    'JBD-FC94DF65C0AA': 'pollock', 'JBD-555F20F0E0E8': 'rasta-dancer', 'JBD-4EBFD8FE11B0': 'rasta-time',
    'JBD-568A5A9B4A53': 'saint-joan', 'JBD-BC84B21654A2': 'sir-puffsalot', 'JBD-02DD40FC029D': 'son-of-ra',
    'JBD-75701CAB2CAE': 'the-chong-b0ng', 'JBD-0C690496751A': 'the-force', 'JBD-10FF513A7CF3': 'the-pale-horseman',
    'JBD-BD2802EC5198': 'the-sun-xix', 'JBD-9631C4591519': 'trenchtown-rock', 'JBD-C08779E1C78F': 'valentino',
    'JBD-C706091E9C43': 'viva-las-vegas', 'JBD-BBEF8E9E848B': 'woodstock',
  };

  const benchMouth = () => {
    const c = $('#bSmoke').getBoundingClientRect(), r = bImg.getBoundingClientRect();
    return [r.left - c.left + cur.mouth[0] * r.width, r.top - c.top + cur.mouth[1] * r.height];
  };

  function ctas(p) {
    const box = $('#bCtas');
    if (p.status !== 'available') {
      box.innerHTML = `<button type="button" class="btn btn-ink" id="bLeft">See what's still available</button>`;
      $('#bLeft').onclick = () => { only.checked = true; apply(); close(); document.getElementById('s-' + p.shelf)?.scrollIntoView(); };
      return;
    }
    box.innerHTML = p.online
      ? `${p.variants && p.variants.length > 1 ? `<label class="bvar"><span>${esc(p.opt || 'Option')}</span><select id="bVar">${p.variants.map(([id, t, pr]) => `<option value="${id}" data-pr="${pr}">${esc(t)}, ${money(pr)}</option>`).join('')}</select></label>` : ''}<a class="btn btn-red" id="bBuy" href="${p.buy}" target="_blank" rel="noopener">Buy it, ${money(p.price)}</a>`
      : `<a class="btn btn-red" id="bBuy" href="mailto:sales@jeromebakerny.com?subject=${encodeURIComponent(`Jerome Baker glass: ${p.name} (${p.id})`)}">Ask to buy this piece</a>`;
    const sel = $('#bVar');
    if (sel) sel.onchange = () => {
      const o = sel.selectedOptions[0];
      $('#bBuy').href = `https://jeromebaker.com/cart/${sel.value}:1`;
      $('#bBuy').textContent = `Buy it, ${money(o.dataset.pr)}`;
      $('#bPrice').textContent = money(o.dataset.pr);
    };
  }

  function show(p) {
    cur = p;
    page.off('hero');
    bSmoke.ps = [];
    if (typeof clearActor === 'function') clearActor();  // a new piece gets a fresh visitor
    bImg.src = img(p);
    bImg.alt = `${p.name}, hand-blown Jerome Baker glass`;
    bPiece.classList.toggle('wide', p.w > p.h * .9);
    bFill.style.webkitMaskImage = bFill.style.maskImage = `url(${img(p)})`;
    setLvl(0);
    $('#bSeries').textContent = [p.series, p.shape].filter(Boolean).join(', ');
    $('#bName').textContent = p.name;
    const pr = $('#bPrice');
    pr.textContent = money(p.price);
    pr.classList.toggle('sold', p.status !== 'available');
    $('#bStatus').textContent = p.status === 'available'
      ? (p.shop ? 'Available. Checkout and shipping happen on jeromebaker.com.' : p.online ? 'Available. Ships from the studio with its provenance record.' : 'Available through our team. Ask and we will hold it for you.')
      : p.status === 'sold' ? 'Sold. Somebody already took this one home.' : 'In a collection. It is registered to its owner.';
    ctas(p);
    $('#b3d').hidden = !MODELS[p.id];
    // every photo of the piece, right there in the panel (they used to hide behind "Zoom in on the detail")
    const ph = photosOf(p).slice(1), ang = $('#bAngles');
    ang.hidden = !ph.length;
    $('#bAngleRow').innerHTML = ph.map((x, i) => `<button type="button" data-i="${i + 1}" aria-label="${esc(x.label || x.alt || 'Photo ' + (i + 2))}"><img src="${x.thumb || x.src}" alt="" loading="lazy" decoding="async">${x.label ? `<span>${esc(x.label)}</span>` : ''}</button>`).join('');
    $('#bAngleN').textContent = ph.length === 1 ? '1 photo' : `${ph.length} photos`;
    const ids = visible(), at = ids.indexOf(p.id);
    const nb = (d) => byId[ids[(at + d + ids.length) % ids.length]];
    $('#bPrevName').textContent = ids.length > 1 && nb(-1) ? nb(-1).name : '';
    $('#bNextName').textContent = ids.length > 1 && nb(1) ? nb(1).name : '';
    $('#bDesc').textContent = p.desc;
    $('#bFacts').innerHTML = [
      p.edition && ['Edition', p.edition],
      ['Series', p.series],
      p.shape && p.shop && ['Type', p.shape],
      p.inches && ['Height', `About ${p.inches} in`],
      p.shop ? ['Order', `<a href="${p.verify}" target="_blank" rel="noopener">jeromebaker.com</a>`] : ['Provenance', `<a href="${p.verify}" target="_blank" rel="noopener">${p.id}</a>`],
    ].filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${k === 'Provenance' || k === 'Order' ? v : esc(v)}</dd>`).join('');
    history.replaceState(null, '', '#p=' + p.id);
    if (!calm) bSmoke.on('idle', () => (bImg.complete ? benchMouth() : null), .18, { ...wisp, size: 16 });
  }

  // Arrived from another page of the site straight into a product (#p=...)? Closing it goes back there,
  // to the same scroll spot, instead of leaving you on this page.
  let cameIn = (() => {
    try { const r = new URL(document.referrer); return /^#p=/.test(location.hash) && r.origin === location.origin && r.pathname !== location.pathname; } catch (_) { return false; }
  })();
  const goBack = () => { if (!cameIn) return false; cameIn = false; if (history.length > 1) history.back(); else location.assign(document.referrer); return true; };
  function open(id) {
    const p = byId[id];
    if (!p) return;
    if (!bench.open) bench.showModal();
    bSmoke.fit();
    show(p);
  }
  function close() {
    if (bench.open) bench.close();
  }
  bench.addEventListener('close', () => {
    bSmoke.off('idle');
    release(true);
    history.replaceState(null, '', location.pathname + location.search);
    if (goBack()) return;
    if (!calm) page.on('hero', mouthOf(heroImg, HERO), .32, { ...wisp, size: 16 });
  });
  $('#bClose').onclick = close;
  $('#bZoom').onclick = () => cur && zoom(cur);
  $('#bAngleRow').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b && cur) { release(true); zoom(cur, null, +b.dataset.i); } });
  // pieces with a finished 3D model: a full-screen spin view, loaded only when asked for (the models are 0.5-4 MB)
  const spin = $('#spin3d'), spinF = $('#spin3dF');
  const closeSpin = () => { spin.hidden = true; spinF.removeAttribute('src'); };
  $('#b3d').onclick = () => { if (!cur || !MODELS[cur.id]) return; release(true); spinF.src = '../assets/3d/' + MODELS[cur.id] + '.html'; spin.hidden = false; $('#spin3dX').focus(); };
  $('#spin3dX').onclick = closeSpin;
  bench.addEventListener('cancel', (e) => { if (!spin.hidden) { e.preventDefault(); closeSpin(); } });
  bench.addEventListener('close', closeSpin);
  // straight to the detail: double-click the piece, or put two fingers on it, and the zoom opens on that spot
  const zspot = (cx, cy) => { const r = bImg.getBoundingClientRect(); return [Math.min(1, Math.max(0, (cx - r.left) / r.width)), Math.min(1, Math.max(0, (cy - r.top) / r.height))]; };
  bPiece.addEventListener('dblclick', (e) => { if (cur) { release(true); zoom(cur, zspot(e.clientX, e.clientY)); } });
  const touches = new Map();
  bPiece.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2 && cur) {
      const [a, b] = [...touches.values()];
      touches.clear(); release(true);
      zoom(cur, zspot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2));
    }
  }, true);
  for (const ev of ['pointerup', 'pointercancel']) bPiece.addEventListener(ev, (e) => touches.delete(e.pointerId), true);
  // a magnifier that follows the mouse over the piece, showing the real pixels
  if (!coarse) {
    const lens = document.createElement('div');
    lens.className = 'loupe'; lens.setAttribute('aria-hidden', 'true');
    bPiece.append(lens);
    const LK = 2.6;
    bPiece.addEventListener('pointermove', (e) => {
      if (!cur || e.pointerType !== 'mouse' || e.buttons) { lens.classList.remove('on'); return; }
      const r = bImg.getBoundingClientRect(), pr = bPiece.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) { lens.classList.remove('on'); return; }
      const url = `../assets/glass/${cur.id}_z.webp`;
      if (lens.dataset.src !== url) { lens.dataset.src = url; lens.style.backgroundImage = `url(${url})`; }
      const L = lens.offsetWidth || 190;
      lens.style.backgroundSize = `${r.width * LK}px ${r.height * LK}px`;
      lens.style.backgroundPosition = `${L / 2 - fx * r.width * LK}px ${L / 2 - fy * r.height * LK}px`;
      lens.style.left = `${e.clientX - pr.left - L / 2}px`; lens.style.top = `${e.clientY - pr.top - L / 2}px`;
      lens.classList.add('on');
    });
    bPiece.addEventListener('pointerleave', () => lens.classList.remove('on'));
    bPiece.addEventListener('pointerdown', () => lens.classList.remove('on'));
  }
  bench.addEventListener('click', (e) => { if (e.target === bench) close(); });
  const step = (d) => {
    const ids = visible();
    const i = ids.indexOf(cur.id);
    show(byId[ids[(i + d + ids.length) % ids.length] || ids[0]]);
  };
  $('#bPrev').onclick = () => step(-1);
  $('#bNext').onclick = () => step(1);
  bench.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* sound, made in the browser: water bubbling while you pull, a cough when you let go. Only ever after a press. */
  const Sfx = (() => {
    let ctx, noise, gurgle = null;
    let on = true;
    try { on = localStorage.getItem('jb-glass-sound') !== 'off'; } catch (e) { /* storage blocked */ }
    const btn = $('#bSnd');
    const paint = () => { btn.setAttribute('aria-pressed', on); btn.textContent = on ? 'Sound on' : 'Sound off'; };
    paint();
    btn.onclick = () => {
      on = !on;
      paint();
      try { localStorage.setItem('jb-glass-sound', on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
      if (!on) stopGurgle();
    };
    const ac = () => {
      if (!on) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const env = (g, t, peak, a, d) => {
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
    };
    // one bubble: a sine that pops upward in pitch
    function blip(v) {
      const c = ac();
      if (!c) return;
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      const f = 170 + Math.random() * 420;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (1.8 + Math.random()), t + .07);
      env(g, t, .18 * v, .006, .08);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + .1);
    }
    // the low rumble of water under the bubbles
    function startGurgle() {
      const c = ac();
      if (!c || gurgle) return;
      const src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
      src.buffer = noise; src.loop = true;
      lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 8;
      lfo.frequency.value = 11; depth.gain.value = 140;
      lfo.connect(depth).connect(lp.frequency);
      g.gain.value = .0001;
      g.gain.setTargetAtTime(.05, c.currentTime, .1);
      src.connect(lp).connect(g).connect(c.destination);
      src.start(); lfo.start();
      gurgle = { src, lfo, g };
    }
    function level(v) { if (gurgle) gurgle.g.gain.setTargetAtTime(.04 + v * .12, ctx.currentTime, .1); }
    function stopGurgle() {
      if (!gurgle) return;
      const { src, lfo, g } = gurgle;
      gurgle = null;
      g.gain.setTargetAtTime(.0001, ctx.currentTime, .05);
      src.stop(ctx.currentTime + .3); lfo.stop(ctx.currentTime + .3);
    }
    // a cough: a rough burst of breath with a bit of voice under it
    function cough(strength) {
      const c = ac();
      if (!c) return;
      const t = c.currentTime;
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noise;
      bp.type = 'bandpass'; bp.frequency.value = 650 + Math.random() * 350; bp.Q.value = .9;
      env(g, t, .7 * strength, .012, .26);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t, Math.random() * .5); src.stop(t + .35);
      const o = c.createOscillator(), vf = c.createBiquadFilter(), vg = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(155 + Math.random() * 45, t);
      o.frequency.exponentialRampToValueAtTime(100, t + .22);
      vf.type = 'bandpass'; vf.frequency.value = 520; vf.Q.value = 1.4;
      env(vg, t, .16 * strength, .01, .2);
      o.connect(vf).connect(vg).connect(c.destination);
      o.start(t); o.stop(t + .26);
    }
    // the lighter: a hard click, two sparks off the wheel, then the hiss of the flame while it burns
    let flame = null;
    function flick() {
      const c = ac();
      if (!c) return;
      const t = c.currentTime;
      [[0, .5, 2600], [.05, .28, 5200], [.09, .2, 6400]].forEach(([dt, v, f]) => {
        const src = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
        src.buffer = noise;
        hp.type = 'highpass'; hp.frequency.value = f;
        env(g, t + dt, v, .002, .03);
        src.connect(hp).connect(g).connect(c.destination);
        src.start(t + dt, Math.random() * .5); src.stop(t + dt + .05);
      });
      if (flame) return;
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noise; src.loop = true;
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .6;
      g.gain.setValueAtTime(.0001, t + .08);
      g.gain.exponentialRampToValueAtTime(.06, t + .2);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t + .08);
      flame = { src, g };
    }
    function douse() {
      if (!flame) return;
      const { src, g } = flame;
      flame = null;
      g.gain.setTargetAtTime(.0001, ctx.currentTime, .04);
      src.stop(ctx.currentTime + .25);
    }
    return { blip, startGurgle, level, stopGurgle, cough, flick, douse, on: () => on };
  })();

  /* the crew member who takes the hit: animated (js/crewanim.js), up a stepladder if the mouthpiece is high */
  const say = $('#bSay'), stageEl = $('#bStage');
  const COUGHS = ['*cough* worth it', '*hack* okay. OKAY.', 'smooth. *cough*', 'who cleaned this?? *cough*', 'one more. *wheeze*', '*cough* I need this one'];
  // recorded-style sounds in assets/sfx (shared with the antics, js/crewanim.js), behind the same sound switch
  const sound = (name) => { if (Sfx.on() && window.JBCrewAnim) JBCrewAnim.play(name); };
  const hush = (name) => { if (window.JBCrewAnim) JBCrewAnim.hush(name); };
  let actor = null, ladder = null, layer = null, run = 0, spot = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const actLayer = () => {
    if (!layer) { layer = document.createElement('div'); layer.className = 'act-layer'; stageEl.appendChild(layer); }
    return layer;
  };
  // a pop-art A-frame stepladder drawn at its real size (so the ink lines stay one weight): yellow rails, red treads,
  // a top cap to stand on
  function stepladder(w, h) {
    const el = document.createElement('div');
    el.className = 'ladder';
    const ink = '#0A0A0A', n = Math.max(2, Math.min(6, Math.round(h / 46)));
    const capH = Math.max(10, Math.min(18, h * .08)), top = capH;
    const lx0 = w * .14, lx1 = w * .02, rx0 = w * .86, rx1 = w * .98;   // front legs splay out toward the floor
    const at = (t, a, b) => a + (b - a) * t;
    let treads = '';
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), y = at(t, top, h);
      treads += `<rect x="${at(t, lx0, lx1) + 3}" y="${y - 5}" width="${at(t, rx0, rx1) - at(t, lx0, lx1) - 6}" height="10" rx="2" fill="#DA2342" stroke="${ink}" stroke-width="3"/>`;
    }
    el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
<path d="M${w * .3} ${top} L${w * .42} ${h} M${w * .7} ${top} L${w * .58} ${h}" stroke="${ink}" stroke-width="5" stroke-linecap="round" opacity=".55"/>
<path d="M${lx0} ${top} L${lx1} ${h}" stroke="${ink}" stroke-width="9" stroke-linecap="round"/><path d="M${lx0} ${top} L${lx1} ${h}" stroke="#FFF100" stroke-width="4" stroke-linecap="round"/>
<path d="M${rx0} ${top} L${rx1} ${h}" stroke="${ink}" stroke-width="9" stroke-linecap="round"/><path d="M${rx0} ${top} L${rx1} ${h}" stroke="#FFF100" stroke-width="4" stroke-linecap="round"/>
${treads}<rect x="${lx0 - 6}" y="0" width="${rx0 - lx0 + 12}" height="${capH}" rx="3" fill="#FFF100" stroke="${ink}" stroke-width="3"/></svg>`;
    return el;
  }
  function clearActor() {
    run++;
    if (actor) actor.remove();
    if (ladder) ladder.remove();
    actor = ladder = spot = null;
    say.classList.remove('on');
  }
  async function walkUp() {
    const CA = window.JBCrewAnim;
    if (!CA || actor) return;
    const me = ++run;
    const st = stageEl.getBoundingClientRect(), r = bImg.getBoundingClientRect();
    const floor = r.bottom - st.top;
    const mx = r.left - st.left + cur.mouth[0] * r.width, my = r.top - st.top + cur.mouth[1] * r.height;
    const H = Math.max(150, Math.min(330, r.height * .6));
    actor = new CA.Actor(actLayer(), CA.cast(), H);
    // stand where the hit pose puts their lips on the mouthpiece
    const f = actor.a.frames.hit, hh = H * f.s, hw = hh * f.w / f.h, m = f.m || [.85, .27];
    // lips on the near edge of the mouthpiece, not its middle
    const x = mx - r.width * .06 - (m[0] - .5) * hw, feet = my - m[1] * hh + hh;
    const lift = floor - feet;
    spot = { x, feet, floor, hw, lift };
    if (lift > 8) {
      // not tall enough: a stepladder unfolds under them
      ladder = stepladder(hw * .78, lift);
      ladder.style.cssText = `left:${x - hw * .39}px;top:${feet}px;width:${hw * .78}px;height:${lift}px`;
      stageEl.insertBefore(ladder, bPiece);  // behind the glass, so the piece stays in view
      ladder.animate([{ scale: '1 .08', opacity: 0 }, { scale: '1 1.04', opacity: 1, offset: .7 }, { scale: '1 1', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,.8,.3,1)' });
    }
    actor.at(-hw, floor);
    await actor.walk(x - hw * .55, 620);
    if (me !== run) return;
    if (lift > 8) { await actor.hop(x, feet); if (ladder) ladder.classList.add('creak'); } else actor.at(x, feet);
    if (me !== run) return;
    actor.pose('lean');
    await wait(140);
    if (me !== run || !holding) return;
    actor.pose('hit');
    sound('lighter');
  }
  async function afterHit(took) {
    const CA = window.JBCrewAnim;
    if (!actor || !CA) return;
    const me = ++run, a = actor, s = spot;
    if (took <= .12) { a.feet !== s.floor && await a.hop(s.x - s.hw * .7, s.floor); await a.walk(-s.hw * 2, 700); if (me === run) clearActor(); return; }
    a.pose('exhale');
    const m = a.mouth();
    if (!calm) bSmoke.burst(m[0], m[1], Math.round(40 + took * 130), 1.4 + took * 1.6);
    await wait(650);
    if (me !== run) return;
    sound('cough');
    const n = took >= .85 ? 3 : took > .45 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      a.pose('cough');
      a.shake(340, 1);
      const c = a.mouth();
      if (!calm) bSmoke.burst(c[0], c[1], 18, 1.3);
      await wait(380);
      if (me !== run) return;
      if (i === 0) speak(COUGHS[(Math.random() * COUGHS.length) | 0]);
    }
    if (took >= .85) {
      // full send: they go over backwards
      a.pose('dizzy');
      await a.el.animate([{ translate: '0 0', rotate: '0deg', opacity: 1 }, { translate: `${-s.hw * .9}px ${s.floor - s.feet + 40}px`, rotate: '-80deg', opacity: 0 }], { duration: 900, easing: 'ease-in', fill: 'forwards' }).finished;
    } else {
      if (s.lift > 8) await a.hop(s.x - s.hw * .75, s.floor);
      a.pose('pose');
      await wait(650);
      if (me !== run) return;
      await a.walk(-s.hw * 2, 900);
    }
    if (me !== run) return;
    // fold the ladder and take it away
    if (ladder) await ladder.animate([{ scale: '1 1', opacity: 1 }, { scale: '.35 1', opacity: 1, offset: .5 }, { scale: '.35 1', opacity: 0, translate: '0 16px' }], { duration: 380, easing: 'ease-in', fill: 'forwards' }).finished;
    if (me === run) clearActor();
  }
  function speak(text) {
    if (!actor) return;
    const h = actor.el.getBoundingClientRect(), st = stageEl.getBoundingClientRect();
    say.textContent = text;
    // clear of the sound and close buttons in the top corners
    say.style.left = Math.max(8, Math.min(h.left - st.left + h.width * .3, st.width - 280)) + 'px';
    say.style.top = Math.max(72, h.top - st.top - 56) + 'px';
    say.classList.add('on');
    setTimeout(() => say.classList.remove('on'), 2000);
  }

  /* hold to take a hit: the glass fills with sm0ke from the base up, bubbles in the water, then you let it go */
  let holding = false, lvl = 0, t0 = 0, raf = 0, drain = 0;
  const FILL_MS = 2600;
  function setLvl(v) {
    lvl = v;
    bFill.style.setProperty('--lvl', v.toFixed(3));
    hit.style.setProperty('--lvl', v.toFixed(3));
  }
  function bubble() {
    const b = document.createElement('i');
    const [bx, by] = cur.base;
    const h = bPiece.clientHeight;
    const s = 4 + Math.random() * 9;
    b.style.cssText = `left:${(bx + (Math.random() - .5) * cur.bw * .55) * 100}%;top:${by * 100 - 3}%;--s:${s}px;--d:${.6 + Math.random() * .5}s;--dx:${(Math.random() - .5) * 14}px;--rise:${h * (.06 + Math.random() * .1)}px`;
    b.addEventListener('animationend', () => b.remove());
    $('#bBubbles').appendChild(b);
  }
  function tick(now) {
    if (!holding) return;
    setLvl(Math.min(1, (now - t0) / FILL_MS));
    if (Math.random() < .55) bubble();
    // as the chamber fills, sm0ke starts leaking out the top
    if (lvl > .5 && Math.random() < (lvl - .4) * .7 && !calm) { const m = benchMouth(); bSmoke.puff(m[0], m[1], { ...wisp, size: 18 + lvl * 10 }); }
    raf = requestAnimationFrame(tick);
  }
  function press(e) {
    if (holding || !cur) return;
    if (e && e.pointerId != null) e.currentTarget.setPointerCapture?.(e.pointerId);
    cancelAnimationFrame(drain);
    holding = true;
    t0 = performance.now() - lvl * FILL_MS;
    hit.classList.add('on');
    $('#bHitLabel').textContent = 'Keep holding';
    sound('rip');
    walkUp();
    raf = requestAnimationFrame(tick);
  }
  function release(quiet) {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(raf);
    hit.classList.remove('on');
    $('#bHitLabel').textContent = 'Hold to take a hit';
    hush('rip');
    const took = lvl;
    if (quiet === true) clearActor();
    else afterHit(took);
    if (took > .12 && quiet !== true) {
      const m = benchMouth();
      if (!calm) {
        // the exhale: a burst, then a column that keeps pouring out the top
        bSmoke.burst(m[0], m[1], Math.round(60 + took * 200), 1.6 + took * 1.8);
        bSmoke.on('exhale', () => benchMouth(), 1.6 + took * 1.6, { size: 30, grow: 1.1, alpha: .55, vy: 2 + took * 1.5, life: 250, spread: 16 });
        setTimeout(() => bSmoke.off('exhale'), 500 + took * 1100);
      }
      const p = cur;
      $('#bStatus').textContent = p.status !== 'available'
        ? `${took >= 1 ? 'Full send.' : 'Easy.'} Somebody already owns this one, but the shelf is still stocked.`
        : `${took >= 1 ? 'Full send.' : 'Smooth.'} ${p.online ? `${money(p.price)} and it ships from the studio.` : 'Ask us and we will hold it for you.'}`;
      const buy = $('#bBuy');
      if (buy) { buy.classList.remove('pulse'); void buy.offsetWidth; buy.classList.add('pulse'); }
    }
    // the chamber clears
    const start = performance.now(), from = lvl;
    const down = (now) => {
      const k = Math.min(1, (now - start) / 900);
      setLvl(from * (1 - k));
      if (k < 1) drain = requestAnimationFrame(down);
    };
    drain = requestAnimationFrame(down);
  }
  for (const el of [hit, bPiece]) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); press(e); });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  hit.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
  hit.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });

  /* deep links: #p=<provenance id> opens that piece */
  const route = () => {
    const m = location.hash.match(/^#p=(JBD-[A-F0-9]+|SHP-\d+)$/);
    if (m && byId[m[1]]) open(m[1]);
  };
  addEventListener('hashchange', route);
  route();
})();

// the JB pattern on each band drifts a little slower than the page (a light parallax). Only bands on screen update.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const live = new Set();
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target))));
  const watch = () => document.querySelectorAll('.band').forEach((b) => { if (!b.dataset.px) { b.dataset.px = '1'; io.observe(b); } });
  watch(); new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
  let q = false;
  addEventListener('scroll', () => {
    if (q) return; q = true;
    requestAnimationFrame(() => {
      q = false;
      const vh = innerHeight;
      live.forEach((b) => { const r = b.getBoundingClientRect(); b.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * -0.15).toFixed(1) + 'px'); });
    });
  }, { passive: true });
})();
