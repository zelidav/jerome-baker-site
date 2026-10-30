/* The Glass showcase: shelves from js/glass-data.js, smoke off any piece you hover, and the bench,
   where you hold a piece down to fill it with smoke and let it go. */
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

  /* ---------------------------------------------------------------- smoke */
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

  class Smoke {
    // world coords: page smoke lives in document coords and scrolls; bench smoke is local to its canvas
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
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * .02, img: puffs[(Math.random() * 4) | 0],
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
  // where the smoke leaves a piece: its mouthpiece, read off the cutout at build time
  const mouthOf = (el, p) => () => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return null;
    return [r.left + p.mouth[0] * r.width, r.top + p.mouth[1] * r.height + scrollY];
  };
  const wisp = { size: 16, grow: .6, alpha: .62, vy: .7, life: 170 };

  /* ---------------------------------------------------------------- shelves */
  const shelvesEl = $('#shelves');
  const card = (p) => {
    const sold = p.status !== 'available';
    const label = p.status === 'sold' ? 'Sold' : p.status === 'collected' ? 'In a collection' : money(p.price);
    return `<button type="button" class="pc${sold ? ' out' : ''}${p.w > p.h * .8 ? ' wide' : ''}" data-id="${p.id}" style="--tilt:${((p.name.length % 7) - 3) * 1.4}deg" aria-label="${esc(p.name)}, ${sold ? label : money(p.price)}">`
      + `<span class="glow" aria-hidden="true"></span>`
      + `<img src="${img(p, true)}" alt="" width="${p.w}" height="${p.h}" loading="lazy" decoding="async">`
      + `<span class="tag${sold ? ' sold' : ''}"><b>${esc(p.name)}</b><span class="pr">${sold ? money(p.price) : label}</span>${sold ? `<small>${label}</small>` : ''}</span></button>`;
  };
  shelvesEl.innerHTML = D.shelves.map((s) => {
    const ps = D.pieces.filter((p) => p.shelf === s.key);
    return `<section class="shelf pad" id="s-${s.key}" data-k="${s.key}" aria-labelledby="h-${s.key}">`
      + `<div class="shelf-head"><h2 id="h-${s.key}"><span>${esc(s.title)}</span></h2><p>${esc(s.line)}</p></div>`
      + `<div class="case">${ps.map(card).join('')}</div></section>`;
  }).join('');

  const chips = $('#shelfChips');
  const renderChips = () => {
    chips.innerHTML = D.shelves.map((s) => {
      const n = shelvesEl.querySelectorAll(`#s-${s.key} .pc:not([hidden])`).length;
      return n ? `<a href="#s-${s.key}">${esc(s.title)}<span>${n}</span></a>` : '';
    }).join('');
  };

  // filters
  let price = 'all';
  const only = $('#onlyAvail');
  const apply = () => {
    const [lo, hi] = price === 'all' ? [0, Infinity] : price.split('-').map((v, i) => (v === '' ? (i ? Infinity : 0) : Number(v)));
    let shown = 0;
    shelvesEl.querySelectorAll('.pc').forEach((el) => {
      const p = byId[el.dataset.id];
      const ok = p.price >= lo && p.price < hi && (!only.checked || p.status === 'available');
      el.hidden = !ok;
      shown += ok;
    });
    shelvesEl.querySelectorAll('.shelf').forEach((s) => { s.hidden = !s.querySelector('.pc:not([hidden])'); });
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

  // hover (or, on phones, scroll a piece to the middle of the screen) and it starts smoking
  const light = (el, on) => {
    el.classList.toggle('lit', on);
    if (calm) return;
    if (on) page.on(el, mouthOf(el.querySelector('img'), byId[el.dataset.id]), .55, wisp);
    else page.off(el);
  };
  if (coarse) {
    const io = new IntersectionObserver((es) => es.forEach((e) => light(e.target, e.isIntersecting)), { rootMargin: '-42% 0px -42% 0px' });
    shelvesEl.querySelectorAll('.pc').forEach((el) => io.observe(el));
  } else {
    shelvesEl.addEventListener('pointerover', (e) => { const el = e.target.closest('.pc'); if (el && !el.classList.contains('lit')) light(el, true); });
    shelvesEl.addEventListener('pointerout', (e) => { const el = e.target.closest('.pc'); if (el && !el.contains(e.relatedTarget)) light(el, false); });
  }
  shelvesEl.addEventListener('focusin', (e) => { const el = e.target.closest('.pc'); if (el) light(el, true); });
  shelvesEl.addEventListener('focusout', (e) => { const el = e.target.closest('.pc'); if (el) light(el, false); });
  shelvesEl.addEventListener('click', (e) => { const el = e.target.closest('.pc'); if (el) open(el.dataset.id); });

  if (coarse) $('#heroHint').textContent = 'Scroll and each piece lights up as it passes. Open one and hold it down.';

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
  const bSmoke = new Smoke($('#bSmoke'), { scrolls: false, cap: 520 });
  let cur = null;

  const benchMouth = () => {
    const c = $('#bSmoke').getBoundingClientRect(), r = bImg.getBoundingClientRect();
    return [r.left - c.left + cur.mouth[0] * r.width, r.top - c.top + cur.mouth[1] * r.height];
  };
  const visible = () => [...shelvesEl.querySelectorAll('.pc:not([hidden])')].map((el) => el.dataset.id);

  function ctas(p) {
    const box = $('#bCtas');
    if (p.status !== 'available') {
      box.innerHTML = `<button type="button" class="btn btn-ink" id="bLeft">See what's still available</button>`;
      $('#bLeft').onclick = () => { only.checked = true; apply(); close(); document.getElementById('s-' + p.shelf)?.scrollIntoView(); };
      return;
    }
    box.innerHTML = p.online
      ? `<a class="btn btn-red" id="bBuy" href="${p.buy}" target="_blank" rel="noopener">Buy it, ${money(p.price)}</a>`
      : `<a class="btn btn-red" id="bBuy" href="mailto:sales@jeromebakerny.com?subject=${encodeURIComponent(`Jerome Baker glass: ${p.name} (${p.id})`)}">Ask to buy this piece</a>`;
  }

  function show(p) {
    cur = p;
    page.off('hero');
    bSmoke.ps = [];
    bImg.src = img(p);
    bImg.alt = `${p.name}, hand-blown Jerome Baker glass`;
    bFill.style.webkitMaskImage = bFill.style.maskImage = `url(${img(p)})`;
    setLvl(0);
    $('#bSeries').textContent = [p.series, p.shape].filter(Boolean).join(', ');
    $('#bName').textContent = p.name;
    const pr = $('#bPrice');
    pr.textContent = money(p.price);
    pr.classList.toggle('sold', p.status !== 'available');
    $('#bStatus').textContent = p.status === 'available'
      ? (p.online ? 'Available. Ships from the studio with its provenance record.' : 'Available through our team. Ask and we will hold it for you.')
      : p.status === 'sold' ? 'Sold. Somebody already took this one home.' : 'In a collection. It is registered to its owner.';
    ctas(p);
    $('#bDesc').textContent = p.desc;
    $('#bFacts').innerHTML = [
      ['Edition', p.edition || '1 of 1'],
      ['Series', p.series],
      p.inches && ['Height', `About ${p.inches} in`],
      ['Provenance', `<a href="${p.verify}" target="_blank" rel="noopener">${p.id}</a>`],
    ].filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${k === 'Provenance' ? v : esc(v)}</dd>`).join('');
    history.replaceState(null, '', '#p=' + p.id);
    if (!calm) bSmoke.on('idle', () => (bImg.complete ? benchMouth() : null), .18, { ...wisp, size: 16 });
  }

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
    if (!calm) page.on('hero', mouthOf(heroImg, HERO), .32, { ...wisp, size: 16 });
  });
  $('#bClose').onclick = close;
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

  /* hold to take a hit: the glass fills with smoke from the base up, bubbles in the water, then you let it go */
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
    if (lvl >= 1 && Math.random() < .3 && !calm) { const m = benchMouth(); bSmoke.puff(m[0], m[1], wisp); }
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
    raf = requestAnimationFrame(tick);
  }
  function release(quiet) {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(raf);
    hit.classList.remove('on');
    $('#bHitLabel').textContent = 'Hold to take a hit';
    const took = lvl;
    if (took > .12 && quiet !== true) {
      const m = benchMouth();
      if (!calm) bSmoke.burst(m[0], m[1], Math.round(30 + took * 110), 1.4 + took * 1.6);
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
    const m = location.hash.match(/^#p=(JBD-[A-F0-9]+)$/);
    if (m && byId[m[1]]) open(m[1]);
  };
  addEventListener('hashchange', route);
  route();
})();
