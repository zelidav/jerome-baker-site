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

  /* ---------------------------------------------------------------- the shop */
  const HOST = 'https://jbcustomer.cannacrypted.com';
  const COLORS = { giant: '#FFF100', le: '#FFFFFF', og: '#05B48F', second: '#FDB514', daily: '#F1F1F1' };
  const shelfOf = Object.fromEntries(D.shelves.map((s) => [s.key, s]));
  const sold = (p) => p.status !== 'available';
  const tagOf = (p) => (p.status === 'sold' ? 'Sold' : p.status === 'collected' ? 'In a collection' : '');
  const luGroups = $('#luGroups'), feats = $('#feats');

  luGroups.innerHTML = D.shelves.map((s) => {
    const ps = D.pieces.filter((p) => p.shelf === s.key);
    return `<div class="lu-g" data-k="${s.key}"><h3>${esc(s.title)} <span>${ps.length}</span></h3><div class="lu-grid">`
      + ps.map((p) => `<button type="button" class="lu-t${sold(p) ? ' out' : ''}" data-id="${p.id}" aria-label="${esc(p.name)}, ${sold(p) ? tagOf(p) : money(p.price)}" title="${esc(p.name)}"><img src="${img(p, true)}" alt="" loading="lazy" decoding="async"></button>`).join('')
      + '</div></div>';
  }).join('');

  const feature = (p) => {
    const sub = [p.series, p.edition || '1 of 1', p.inches && `about ${p.inches} in`].filter(Boolean).join(', ');
    const buy = sold(p) ? ''
      : p.online ? `<a class="btn btn-red" href="${p.buy}" target="_blank" rel="noopener">Buy it</a>`
      : `<a class="btn btn-red" href="mailto:sales@jeromebakerny.com?subject=${encodeURIComponent(`Jerome Baker glass: ${p.name} (${p.id})`)}">Ask to buy</a>`;
    return `<article class="ft${sold(p) ? ' out' : ''}" id="ft-${p.id}" data-id="${p.id}" data-k="${p.shelf}" data-view="piece">`
      + `<div class="ft-stage"><div class="lightbox" aria-hidden="true"></div>`
      + `<img class="ft-img" src="${img(p)}" alt="${esc(p.name)}, hand-blown Jerome Baker glass" width="${Math.round(p.w * 1000 / p.h)}" height="1000" loading="lazy" decoding="async">`
      + `<div class="loupe" aria-hidden="true"></div></div>`
      + `<div class="ft-views" role="group" aria-label="Views"><button type="button" data-v="piece" aria-pressed="true">The piece</button><button type="button" data-v="photo" aria-pressed="false">Studio photo</button><button type="button" data-v="zoom">Zoom in</button></div>`
      + `<h3 class="ft-name">${esc(p.name)}</h3><p class="ft-sub">${esc(sub)}</p>`
      + `<p class="ft-price${sold(p) ? ' sold' : ''}">${money(p.price)}</p>${sold(p) ? `<p class="ft-note">${tagOf(p)}</p>` : ''}`
      + `<div class="ft-acts"><button type="button" class="btn btn-yellow" data-hit>Take a hit</button>${buy}<button type="button" class="btn btn-white" data-more>Details</button></div></article>`;
  };
  feats.innerHTML = D.shelves.map((s) => `<div class="ft-shelf" id="s-${s.key}" data-k="${s.key}"><h2>${esc(s.title)}</h2><p>${esc(s.line)}</p></div>`
    + D.pieces.filter((p) => p.shelf === s.key).map(feature).join('')).join('');

  // filters
  let price = 'all';
  const only = $('#onlyAvail');
  const apply = () => {
    const [lo, hi] = price === 'all' ? [0, Infinity] : price.split('-').map((v, i) => (v === '' ? (i ? Infinity : 0) : Number(v)));
    let shown = 0;
    D.pieces.forEach((p) => {
      const ok = p.price >= lo && p.price < hi && (!only.checked || p.status === 'available');
      $(`#ft-${p.id}`).hidden = !ok;
      luGroups.querySelector(`[data-id="${p.id}"]`).hidden = !ok;
      shown += ok;
    });
    D.shelves.forEach((s) => {
      const any = !!feats.querySelector(`.ft[data-k="${s.key}"]:not([hidden])`);
      $(`#s-${s.key}`).hidden = !any;
      luGroups.querySelector(`.lu-g[data-k="${s.key}"]`).hidden = !any;
    });
    $('#empty').hidden = shown > 0;
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

  // the lineup follows the scroll, and jumps the right column when you pick a piece
  const lineup = $('#lineup');
  const mark = (id) => {
    const p = byId[id];
    luGroups.querySelectorAll('.lu-t[aria-current]').forEach((t) => t.removeAttribute('aria-current'));
    const t = luGroups.querySelector(`[data-id="${id}"]`);
    if (!t) return;
    t.setAttribute('aria-current', 'true');
    lineup.style.setProperty('--lu', COLORS[p.shelf]);
    const box = t.closest('.lu-in, #luGroups');
    if (box) {
      const tr = t.getBoundingClientRect(), br = box.getBoundingClientRect();
      if (tr.top < br.top || tr.bottom > br.bottom) box.scrollTop += tr.top - br.top - br.height / 2;
      if (tr.left < br.left || tr.right > br.right) box.scrollLeft += tr.left - br.left - br.width / 2;
    }
  };
  mark(D.pieces[0].id);
  const follow = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && mark(e.target.dataset.id)), { rootMargin: '-48% 0px -48% 0px' });
  feats.querySelectorAll('.ft').forEach((el) => follow.observe(el));
  luGroups.addEventListener('click', (e) => {
    const t = e.target.closest('.lu-t');
    if (!t) return;
    const el = $(`#ft-${t.dataset.id}`);
    const offset = coarse || innerWidth <= 900 ? lineup.offsetHeight + 8 : 16;
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset, behavior: calm ? 'auto' : 'smooth' });
    mark(t.dataset.id);
  });

  // views, zoom and the buttons on each piece
  const zoomer = $('#zoomer'), zImg = $('#zImg'), zPan = $('#zPan');
  const zoom = (p) => {
    zImg.src = `../assets/glass/${p.id}_z.webp`;
    zImg.alt = `${p.name}, close up`;
    zImg.width = p.zw; zImg.height = p.zh;
    zoomer.showModal();
    requestAnimationFrame(() => { zPan.scrollLeft = (zPan.scrollWidth - zPan.clientWidth) / 2; zPan.scrollTop = 0; });
  };
  $('#zClose').onclick = () => zoomer.close();
  zoomer.addEventListener('click', (e) => { if (e.target === zoomer) zoomer.close(); });
  let drag = null;
  zPan.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; drag = [e.clientX, e.clientY, zPan.scrollLeft, zPan.scrollTop]; zPan.classList.add('drag'); zPan.setPointerCapture(e.pointerId); });
  zPan.addEventListener('pointermove', (e) => { if (!drag) return; zPan.scrollLeft = drag[2] - (e.clientX - drag[0]); zPan.scrollTop = drag[3] - (e.clientY - drag[1]); });
  zPan.addEventListener('pointerup', () => { drag = null; zPan.classList.remove('drag'); });

  feats.addEventListener('click', (e) => {
    const ft = e.target.closest('.ft');
    if (!ft) return;
    const p = byId[ft.dataset.id];
    const v = e.target.closest('.ft-views button');
    if (v) {
      if (v.dataset.v === 'zoom') { zoom(p); return; }
      ft.dataset.view = v.dataset.v;
      ft.querySelectorAll('.ft-views button[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', b === v));
      ft.querySelector('.ft-img').src = v.dataset.v === 'photo' ? `${HOST}/piece/${p.id}/image.jpg` : img(p);
      light(ft, false);
      return;
    }
    if (e.target.closest('[data-hit]')) { open(p.id); $('#bHit').focus(); return; }
    if (e.target.closest('[data-more]')) { open(p.id); return; }
    if (e.target.closest('.ft-img') && ft.dataset.view === 'piece') zoom(p);
  });

  // the loupe: hover the piece and see the glass up close, at full photo resolution
  if (!coarse) {
    feats.addEventListener('pointermove', (e) => {
      const im = e.target.closest('.ft-img');
      const ft = im && im.closest('.ft');
      feats.querySelectorAll('.loupe.on').forEach((l) => { if (!ft || !ft.contains(l)) l.classList.remove('on'); });
      if (!im || ft.dataset.view !== 'piece') return;
      const p = byId[ft.dataset.id], lp = ft.querySelector('.loupe');
      const r = im.getBoundingClientRect(), st = im.parentElement.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const k = Math.max(2, p.zh / r.height);
      if (lp.dataset.id !== p.id) { lp.style.backgroundImage = `url(../assets/glass/${p.id}_z.webp)`; lp.dataset.id = p.id; }
      lp.style.backgroundSize = `${r.width * k}px ${r.height * k}px`;
      lp.style.backgroundPosition = `${115 - x * k}px ${115 - y * k}px`;
      lp.style.left = (e.clientX - st.left - 115) + 'px';
      lp.style.top = (e.clientY - st.top - 115) + 'px';
      lp.classList.add('on');
    });
    feats.addEventListener('pointerleave', () => feats.querySelectorAll('.loupe.on').forEach((l) => l.classList.remove('on')));
  }

  // hover a piece (on phones: scroll it to the middle of the screen) and it starts smoking
  const light = (el, on) => {
    el.classList.toggle('lit', on);
    if (calm) return;
    if (on && el.dataset.view === 'piece') page.on(el, mouthOf(el.querySelector('.ft-img'), byId[el.dataset.id]), .55, wisp);
    else page.off(el);
  };
  if (coarse) {
    const io = new IntersectionObserver((es) => es.forEach((e) => light(e.target, e.isIntersecting)), { rootMargin: '-40% 0px -40% 0px' });
    feats.querySelectorAll('.ft').forEach((el) => io.observe(el));
  } else {
    feats.addEventListener('pointerover', (e) => { const el = e.target.closest('.ft-stage') && e.target.closest('.ft'); if (el && !el.classList.contains('lit')) light(el, true); });
    feats.addEventListener('pointerout', (e) => { const st = e.target.closest('.ft-stage'); if (st && !st.contains(e.relatedTarget)) light(st.closest('.ft'), false); });
  }
  const visible = () => [...feats.querySelectorAll('.ft:not([hidden])')].map((el) => el.dataset.id);
  new IntersectionObserver(([e]) => document.body.classList.toggle('in-shop', e.isIntersecting), { rootMargin: '-50% 0px -50% 0px' }).observe(feats);

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
      ? `<a class="btn btn-red" id="bBuy" href="${p.buy}" target="_blank" rel="noopener">Buy it, ${money(p.price)}</a>`
      : `<a class="btn btn-red" id="bBuy" href="mailto:sales@jeromebakerny.com?subject=${encodeURIComponent(`Jerome Baker glass: ${p.name} (${p.id})`)}">Ask to buy this piece</a>`;
  }

  function show(p) {
    cur = p;
    page.off('hero');
    bSmoke.ps = [];
    hitter.className = 'hitter';  // a new piece gets a fresh visitor
    say.classList.remove('on');
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
    return { blip, startGurgle, level, stopGurgle, cough, flick, douse };
  })();

  const hitter = $('#bHitter'), say = $('#bSay');
  const COUGHS = ['*cough* worth it', '*hack* okay. OKAY.', 'smooth. *cough*', 'who cleaned this?? *cough*', 'one more. *wheeze*', '*cough* I need this one'];
  let hitterOut = 0;
  function walkUp() {
    const crew = window.JB_CREW || [];
    if (!crew.length) return;
    clearTimeout(hitterOut);
    const c = crew[(Math.random() * crew.length) | 0];
    const st = $('#bStage').getBoundingClientRect(), r = bImg.getBoundingClientRect();
    const mx = r.left - st.left + cur.mouth[0] * r.width, my = r.top - st.top + cur.mouth[1] * r.height;
    const ch = Math.max(150, Math.min(320, r.height * .45));
    hitter.src = `../assets/crew/${c.img}_m.webp`;
    hitter.style.setProperty('--ch', ch + 'px');
    hitter.style.left = Math.min(mx + 4, st.width - ch * .8) + 'px';
    hitter.style.top = Math.max(8, my - ch * .1) + 'px';
    hitter.className = 'hitter';
    void hitter.offsetWidth;
    hitter.classList.add('in');
    setTimeout(() => { if (hitter.classList.contains('in')) hitter.classList.add('at'); }, 800);
  }
  const lighter = $('#bLighter');
  let flickT = 0;
  function light_up() {
    const [bx, by] = cur.base;
    lighter.style.left = Math.min(96, (bx + cur.bw * .42) * 100) + '%';
    lighter.style.top = (by * 100 - 14) + '%';
    lighter.classList.add('on');
    clearTimeout(flickT);
    flickT = setTimeout(() => {
      if (!holding) return;
      Sfx.flick();
      lighter.classList.add('lit');
    }, hitter.classList.contains('at') ? 150 : 650);
  }
  function lights_out() {
    clearTimeout(flickT);
    Sfx.douse();
    lighter.classList.remove('lit');
    setTimeout(() => { if (!holding) lighter.classList.remove('on'); }, 400);
  }
  function walkOff(delay) {
    clearTimeout(hitterOut);
    hitterOut = setTimeout(() => { hitter.className = 'hitter'; say.classList.remove('on'); }, delay);
  }
  function speak(text) {
    const h = hitter.getBoundingClientRect(), st = $('#bStage').getBoundingClientRect();
    say.textContent = text;
    // clear of the sound and close buttons in the top corners
    say.style.left = Math.max(8, Math.min(h.left - st.left + h.width * .3, st.width - 280)) + 'px';
    say.style.top = Math.max(72, h.top - st.top - 56) + 'px';
    say.classList.add('on');
  }

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
    if (Math.random() < .55) { bubble(); if (Math.random() < .5) Sfx.blip(.45 + lvl * .55); }
    Sfx.level(lvl);
    // as the chamber fills, smoke starts leaking out the top
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
    Sfx.startGurgle();
    walkUp();
    light_up();
    raf = requestAnimationFrame(tick);
  }
  function release(quiet) {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(raf);
    hit.classList.remove('on');
    $('#bHitLabel').textContent = 'Hold to take a hit';
    Sfx.stopGurgle();
    lights_out();
    const took = lvl;
    if (quiet === true) { hitter.className = 'hitter'; say.classList.remove('on'); }
    if (took <= .12 && quiet !== true) walkOff(200);
    if (took > .12 && quiet !== true) {
      const m = benchMouth();
      if (!calm) {
        // the exhale: a burst, then a column that keeps pouring out the top
        bSmoke.burst(m[0], m[1], Math.round(60 + took * 200), 1.6 + took * 1.8);
        bSmoke.on('exhale', () => benchMouth(), 1.6 + took * 1.6, { size: 30, grow: 1.1, alpha: .55, vy: 2 + took * 1.5, life: 250, spread: 16 });
        setTimeout(() => bSmoke.off('exhale'), 500 + took * 1100);
      }
      // then the coughing, each one kicking out another cloud
      const n = took >= .85 ? 3 : took > .45 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (!bench.open) return;
          Sfx.cough(.6 + took * .4);
          const mm = benchMouth();
          if (!calm) bSmoke.burst(mm[0], mm[1] + 10, 22, 1.4);
          if (hitter.classList.contains('in')) { hitter.classList.remove('at', 'cough'); void hitter.offsetWidth; hitter.classList.add('cough'); }
        }, 650 + i * 380);
      }
      if (hitter.classList.contains('in')) setTimeout(() => speak(COUGHS[(Math.random() * COUGHS.length) | 0]), 700);
      walkOff(650 + n * 380 + 1500);
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
