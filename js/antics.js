/* Crew antics on the shopping pages. Every so often an animated crew member walks in and messes with a
   product on screen: grabs it and runs, slowly strokes the glass, tries it on, or grabs it and gets popped by
   Torch, who puts it back. Every 8-14s on the list; in an open piece or product, within a second of opening and again every 4-7s. Everyone gets a turn before anyone repeats.
   Needs js/anim-data.js + js/crewanim.js. Test hook: JBAntics.run('snatch' | 'stroke' | 'tryon' | 'bust'). */
(() => {
  const CA = window.JBCrewAnim;
  if (!CA || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { Actor, humanoids, wait, preload, cast } = CA;
  const base = document.documentElement.dataset.base || '';
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const rand = (a, b) => a + Math.random() * (b - a);

  // where the products are, list and detail, on the two shopping pages
  const PAGES = [
    { test: () => document.getElementById('bench'), list: '.tile:not([hidden]) .cut', dialog: '#bench', detail: '#bImg', stage: '.bench-stage', busy: () => document.querySelector('#bHit.on') || document.querySelector('.bench-stage .actor') },
    { test: () => document.getElementById('pd'), list: '.pcard img.main', dialog: '#pd', detail: '#pdImg', stage: '.pd-big', busy: () => false },
  ];
  const P = PAGES.find((p) => p.test());
  if (!P) return;

  /* ---------------------------------------------------------------- sound (same switch as the glass bench) */
  const soundOn = () => { try { return localStorage.getItem('jb-glass-sound') !== 'off'; } catch (e) { return true; } };
  const sound = (name) => { if (soundOn()) CA.play(name); };

  /* ---------------------------------------------------------------- stage helpers */
  const layerIn = (host) => {
    let l = host.querySelector(':scope > .antics');
    if (!l) { l = document.createElement('div'); l.className = 'antics'; host.appendChild(l); }
    l.classList.toggle('fixed', host === document.body);
    return l;
  };
  const box = (el, host) => {
    const r = el.getBoundingClientRect(), h = host === document.body ? { left: 0, top: 0 } : host.getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height };
  };
  const say = (layer, actor, text, ms = 1800) => {
    const b = document.createElement('p');
    b.className = 'ant-say';
    b.textContent = text;
    layer.appendChild(b);
    const [w, h] = actor.size();
    b.style.transform = `translate(${actor.x - w * .2}px,${actor.feet - h - 50}px)`;
    setTimeout(() => b.remove(), ms);
  };
  // a copy of the product that the crew member can carry around
  const ghost = (layer, src, b) => {
    const g = document.createElement('img');
    g.className = 'ant-item';
    g.src = src;
    g.alt = '';
    Object.assign(g.style, { width: b.w + 'px', height: b.h + 'px', transform: `translate(${b.x}px,${b.y}px)` });
    g._b = { ...b };
    layer.appendChild(g);
    return g;
  };
  const fly = (g, b, ms) => {
    const a = g.animate([{ transform: `translate(${g._b.x}px,${g._b.y}px)`, width: g._b.w + 'px', height: g._b.h + 'px' },
      { transform: `translate(${b.x}px,${b.y}px)`, width: b.w + 'px', height: b.h + 'px' }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    return a.finished.then(() => { Object.assign(g.style, { width: b.w + 'px', height: b.h + 'px', transform: `translate(${b.x}px,${b.y}px)` }); g._b = { ...b }; a.cancel(); });
  };
  const puff = (layer, x, y, n, dir) => {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'ant-puff';
      const s = 18 + Math.random() * 30;
      Object.assign(p.style, { width: s + 'px', height: s + 'px', left: x - s / 2 + 'px', top: y - s / 2 + 'px' });
      layer.appendChild(p);
      p.animate([{ opacity: .9, scale: .4, translate: '0 0' }, { opacity: 0, scale: 2.6, translate: `${dir * (30 + Math.random() * 80)}px ${-40 - Math.random() * 90}px` }],
        { duration: 1400 + Math.random() * 900, delay: i * 70, easing: 'ease-out', fill: 'forwards' }).finished.then(() => p.remove());
    }
  };
  const restore = (t) => {
    t.style.visibility = '';
    t.animate([{ scale: .4, opacity: 0 }, { scale: 1.08, opacity: 1 }, { scale: 1 }], { duration: 420, easing: 'ease-out' });
  };
  // the item over the actor's head (carry), or on it (try-on)
  const overHead = (a, b, k) => { const [w, h] = a.size(); const iw = b.w * k, ih = b.h * k; return { x: a.x - iw / 2, y: a.feet - h - ih * .7, w: iw, h: ih }; };
  // run alongside: move the item with the actor every frame
  const follow = (g, a, b, k, until) => {
    const go = () => { const o = overHead(a, b, k); g.style.transform = `translate(${o.x}px,${o.y}px)`; g._b = o; if (!until.done) requestAnimationFrame(go); };
    requestAnimationFrame(go);
  };

  /* ---------------------------------------------------------------- the bits */
  const BITS = {
    // grabs it and runs
    async snatch(t, host, layer, W) {
      const b = box(t, host), H = Math.max(150, Math.min(280, b.h * .8)), floor = b.y + b.h;
      const a = new Actor(layer, cast(['torch']), H);
      const fromLeft = b.x + b.w / 2 > W / 2;
      a.at(fromLeft ? -H * .5 : W + H * .5, floor);
      await a.walk(fromLeft ? b.x - H * .2 : b.x + b.w + H * .2, 1100);
      a.face(fromLeft).pose('reach');
      await wait(300);
      const g = ghost(layer, t.currentSrc || t.src, b);
      t.style.visibility = 'hidden';
      a.pose('carry');
      say(layer, a, pick(['Mine now.', 'Nobody saw that.', "It's for my cousin.", 'Five finger discount.']));
      await fly(g, overHead(a, b, .5), 300);
      const until = {};
      follow(g, a, b, .5, until);
      await runCarry(a, fromLeft ? W + H : -H);
      until.done = true;
      a.remove(); g.remove();
      await wait(1100);
      restore(t);
    },
    // slowly, lovingly strokes the glass
    async stroke(t, host, layer, W) {
      const b = box(t, host), H = Math.max(150, Math.min(280, b.h * .8)), floor = b.y + b.h;
      const a = new Actor(layer, cast(), H);
      const left = b.x + b.w / 2 > W / 2;
      a.at(left ? -H * .5 : W + H * .5, floor);
      await a.walk(left ? b.x - H * .12 : b.x + b.w + H * .12, 1100);
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
    async tryon(t, host, layer, W) {
      const b = box(t, host), H = Math.max(150, Math.min(280, b.h * .8)), floor = b.y + b.h;
      const a = new Actor(layer, cast(), H);
      const fromLeft = b.x + b.w / 2 > W / 2;
      a.at(fromLeft ? -H * .5 : W + H * .5, floor);
      await a.walk(fromLeft ? b.x - H * .2 : b.x + b.w + H * .2, 1100);
      a.face(fromLeft).pose('reach');
      await wait(300);
      const g = ghost(layer, t.currentSrc || t.src, b);
      t.style.visibility = 'hidden';
      a.pose('pose');
      const [, h] = a.size();
      const k = (H * .5) / b.h;
      await fly(g, { x: a.x - b.w * k / 2, y: a.feet - h - b.h * k * .45, w: b.w * k, h: b.h * k }, 450);
      say(layer, a, pick(['How do I look?', 'Is this my color?', 'Ring me up.', 'It fits.']), 2000);
      await wait(2000);
      await fly(g, b, 420);
      g.remove();
      t.style.visibility = '';
      await a.walk(fromLeft ? -H : W + H, 1100);
      a.remove();
    },
    // grabs it, Torch pops him in the face and puts it back
    async bust(t, host, layer, W) {
      const b = box(t, host), H = Math.max(150, Math.min(280, b.h * .8)), floor = b.y + b.h;
      const fromLeft = b.x + b.w / 2 > W / 2;
      const thief = new Actor(layer, cast(['torch']), H);
      const torch = new Actor(layer, 'torch', H * 1.05);
      thief.at(fromLeft ? -H * .5 : W + H * .5, floor);
      torch.at(fromLeft ? W + H : -H, floor);
      await thief.walk(fromLeft ? b.x - H * .2 : b.x + b.w + H * .2, 1000);
      thief.face(fromLeft).pose('reach');
      await wait(260);
      const g = ghost(layer, t.currentSrc || t.src, b);
      t.style.visibility = 'hidden';
      thief.pose('carry');
      await fly(g, overHead(thief, b, .5), 280);
      const until = {};
      follow(g, thief, b, .5, until);
      // they meet in the middle of the thief's escape route
      const meet = fromLeft ? Math.min(W - H * .7, thief.x + H * 1.2) : Math.max(H * .7, thief.x - H * 1.2);
      await Promise.all([runCarry(thief, meet - (fromLeft ? H * .35 : -H * .35), 550), torch.walk(meet + (fromLeft ? H * .3 : -H * .3), 550, true)]);
      torch.face(!fromLeft).pose('punch');
      sound('punch');
      const pow = document.createElement('div');
      pow.className = 'ant-pow';
      pow.textContent = pick(['POW!', 'BONK!', 'WHAP!', 'SMACK!']);
      pow.style.transform = `translate(${meet - 50}px,${floor - H * .9}px)`;
      layer.appendChild(pow);
      until.done = true;
      thief.pose('dizzy');
      thief.el.animate([{ rotate: '0deg', translate: '0 0', opacity: 1 }, { rotate: `${fromLeft ? -540 : 540}deg`, translate: `${fromLeft ? -300 : 300}px ${-H * .4}px`, opacity: 0 }], { duration: 800, easing: 'ease-out', fill: 'forwards' });
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
    async sesh(t, host, layer, W) {
      const b = box(t, host), H = Math.max(150, Math.min(280, b.h * .8)), floor = b.y + b.h;
      const a = new Actor(layer, cast(), H);
      const left = b.x + b.w / 2 > W / 2;
      a.at(left ? -H * .5 : W + H * .5, floor);
      await a.walk(left ? b.x - H * .15 : b.x + b.w + H * .15, 1000);
      a.face(left).pose('lean');
      await wait(220);
      a.pose('hit');
      sound('lighter');
      await wait(500);
      sound('rip');
      t.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.25) saturate(1.3)' }, { filter: 'brightness(1)' }], { duration: 1600 });
      await wait(1600);
      CA.hush('rip');
      a.pose('exhale');
      puff(layer, ...a.mouth(), 7, left ? 1 : -1);
      await wait(650);
      sound('cough');
      for (let i = 0; i < 2; i++) { a.pose('cough'); a.shake(320, 1); puff(layer, ...a.mouth(), 3, left ? 1 : -1); await wait(380); }
      say(layer, a, pick(['*cough* worth it.', 'Who packed this??', 'Smooth. *hack*', 'I can see sounds.']), 1800);
      a.pose('dizzy');
      await wait(900);
      await a.walk(left ? -H : W + H, 1400);
      a.remove();
    },
    // two of them grab it at once and play tug of war till it snaps back where it was
    async tug(t, host, layer, W) {
      const b = box(t, host), H = Math.max(140, Math.min(250, b.h * .72)), floor = b.y + b.h;
      const l = new Actor(layer, cast(), H), r = new Actor(layer, cast([l.slug]), H);
      l.at(-H * .5, floor); r.at(W + H * .5, floor);
      await Promise.all([l.walk(b.x - H * .2, 900), r.walk(b.x + b.w + H * .2, 900)]);
      l.face(true).pose('reach'); r.face(false).pose('reach');
      say(layer, l, pick(['I saw it first.', 'Mine.', 'Let go.']), 1400);
      await wait(500);
      const g = ghost(layer, t.currentSrc || t.src, b);
      t.style.visibility = 'hidden';
      say(layer, r, pick(['Nope.', 'I called it.', 'Over my dead body.']), 1400);
      for (let i = 0; i < 6; i++) {
        const d = (i % 2 ? 1 : -1) * Math.min(26, b.w * .12);
        g.animate([{ translate: '0 0', rotate: '0deg' }, { translate: `${d}px 0`, rotate: `${d / 6}deg` }], { duration: 160, fill: 'forwards' });
        (i % 2 ? r : l).shake(160, 1);
        await wait(170);
      }
      g.remove();
      restore(t);
      l.pose('dizzy'); r.pose('dizzy');
      l.el.animate([{ translate: '0 0' }, { translate: `${-H * .5}px 0` }], { duration: 300, fill: 'forwards' });
      r.el.animate([{ translate: '0 0' }, { translate: `${H * .5}px 0` }], { duration: 300, fill: 'forwards' });
      await wait(700);
      l.el.getAnimations().forEach((x) => x.cancel()); r.el.getAnimations().forEach((x) => x.cancel());
      await Promise.all([l.walk(-H, 1000), r.walk(W + H, 1000)]);
      l.remove(); r.remove();
    },
    // gets one good look and passes out
    async faint(t, host, layer, W) {
      const b = box(t, host), H = Math.max(150, Math.min(280, b.h * .8)), floor = b.y + b.h;
      const a = new Actor(layer, cast(), H);
      const left = b.x + b.w / 2 > W / 2;
      a.at(left ? -H * .5 : W + H * .5, floor);
      await a.walk(left ? b.x - H * .25 : b.x + b.w + H * .25, 1000);
      a.face(left).pose('pose');
      say(layer, a, pick(['Is it... breathing?', 'Too beautiful.', 'Hold me.', 'I need to sit down.']), 1500);
      await wait(1300);
      a.pose('dizzy');
      await a.shake(300, 2);
      await a.el.animate([{ rotate: '0deg', opacity: 1 }, { rotate: `${left ? -88 : 88}deg`, opacity: 1, offset: .7 }, { rotate: `${left ? -88 : 88}deg`, opacity: 0 }], { duration: 1500, easing: 'ease-in', fill: 'forwards' }).finished;
      a.remove();
    },
  };
  // run with the item overhead: the carry pose bobbing along
  async function runCarry(a, x, ms = 800) {
    const from = a.x, t0 = performance.now();
    a.face(x >= from);
    let i = 0;
    for (;;) {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.pose('carry');
      a.at(from + (x - from) * k, a.feet);
      a.el.style.translate = `0 ${i++ % 2 ? -6 : 0}px`;
      if (k >= 1) break;
      await wait(70);
    }
    a.el.style.translate = '';
  }
  // glass gets the sesh; everything gets the rest
  const WEIGHTS = [['snatch', 3], ['tryon', 3], ['bust', 2], ['stroke', 2], ['tug', 2], ['faint', 2], ...(P.list.includes('.tile') ? [['sesh', 4]] : [])];
  let lastBit = '';
  const choose = () => {
    const ws = WEIGHTS.filter(([k]) => k !== lastBit);
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
    if (running) return false;
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
    running = true;
    const layer = layerIn(host);
    const W = host === document.body ? innerWidth : host.clientWidth;
    try { await BITS[kind || choose()](target, host, layer, W); } catch (e) { target.style.visibility = ''; console.warn('antics', e); }
    layer.replaceChildren();
    running = false;
    return true;
  }
  window.JBAntics = { run };
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
    new MutationObserver(() => { loop++; if (dlg.open) again(loop, rand(500, 1100)); })
      .observe(dlg, { attributes: true, attributeFilter: ['open'] });
  }
})();
