// waits for the first screen and an idle moment: the crew is decoration, not first paint
((go) => {
  const run = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 300));
  document.readyState === 'complete' ? run() : addEventListener('load', run, { once: true });
})(() => {
  // The JB Crew drops by. One or two at a time (one on a phone), they peek in from the edge of the screen, look
  // around, float in, hang out for a bit, bump into each other and talk, then duck back out. A pause, then somebody
  // else. Tap one and it asks if it should stick around: say yes and that one stays for the rest of the visit, on
  // every page. On a crew page that member is the star and stays the whole time. Needs window.JB_CREW (js/crew-data.js).
  // Lite mode (js/litemode.js) and "Hide the crew" turn them off.
  const crew = window.JB_CREW;
  if (!crew || !crew.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = document.documentElement.dataset.base || '';
  const only = document.body.dataset.crewSelf || '';
  const saver = (() => { try { return localStorage.getItem('jb-lite') === '1'; } catch (e) { return false; } })();

  // ---------- Brain ----------
  // Swap this for a model later: JBCrew.brain = async (who, ctx) => 'text'
  // ctx = { kind: 'hello' | 'bump' | 'reply' | 'chat', with: otherMember?, said: string?, page: location.pathname }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const cannedBrain = async (who, ctx) => {
    if (ctx.kind === 'bump' && ctx.with) return pick([`Watch it, ${ctx.with.name}.`, `Oh hey ${ctx.with.name}.`, `${ctx.with.name}! Nice ${pick(['hat', 'fit', 'shoes', 'energy'])}.`, ...who.lines]);
    if (ctx.kind === 'reply' && ctx.with) return pick(['Sorry. Sorry.', 'My bad.', 'You bumped me.', 'Again?', ...who.lines]);
    return pick(who.lines);
  };
  window.JBCrew = window.JBCrew || {};
  JBCrew.brain = JBCrew.brain || cannedBrain;
  const think = async (who, ctx) => { try { return await JBCrew.brain(who, { page: location.pathname, ...ctx }); } catch (e) { return cannedBrain(who, ctx); } };


  // ---------- One show at a time ----------
  // window.JBStage: the dance (js/dance.js sets html[data-dancing] and fires 'jb:dance'), bench antics, the holo
  // thief and the crew drop-ins all check it, so two shows never run at once
  const S = window.JBStage = window.JBStage || (() => {
    const st = { who: null, until: 0,
      busy() { return document.documentElement.dataset.dancing === '1' || !!st.who || performance.now() < st.until; },
      claim(name) { if (st.busy()) return false; st.who = name; return true; },
      release(name, rest = 2500) { if (st.who === name) { st.who = null; st.until = performance.now() + rest; } } };
    addEventListener('jb:dance', (e) => { if (e.detail && e.detail.state === 'done') st.until = performance.now() + 4000; });
    return st;
  })();

  // ---------- The corner buttons ----------
  // "Hide the crew" shares the bottom-left corner with the Lite mode switch (js/litemode.js)
  const corner = () => {
    let c = document.querySelector('.jb-corner');
    if (!c) { c = document.createElement('div'); c.className = 'jb-corner'; document.body.appendChild(c); }
    return c;
  };
  JBCrew.corner = corner;
  if (saver) return;   // Lite mode: no crew at all, the Lite switch says so

  const layer = document.createElement('div');
  layer.className = 'crew-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'crew-toggle';
  const setHidden = (on) => {
    document.body.classList.toggle('no-crew', on);
    toggle.textContent = on ? 'Bring the crew back' : 'Hide the crew';
    try { localStorage.setItem('jbNoCrew', on ? '1' : ''); } catch (e) {}
  };
  toggle.addEventListener('click', () => setHidden(!document.body.classList.contains('no-crew')));
  corner().prepend(toggle);
  let hiddenSaved = '';
  try { hiddenSaved = localStorage.getItem('jbNoCrew') || ''; } catch (e) {}
  setHidden(!!hiddenSaved);

  const small = innerWidth < 720;
  const MAX = small ? 1 : 2;   // on screen at once, not counting whoever was asked to stay
  let stay = '';
  try { stay = sessionStorage.getItem('jbCrewStay') || ''; } catch (e) {}
  const bySlug = (s) => crew.find((c) => c.slug === s);
  const bodies = [];
  JBCrew.bodies = bodies;

  // ---------- A body ----------
  const make = (who, pinned) => {
    const el = document.createElement('div');
    el.className = 'floater' + (pinned ? ' pinned' : '');
    const w = Math.round((small ? 74 : 118) + Math.random() * (small ? 16 : 40)) + (pinned && only ? 20 : 0);
    el.style.setProperty('--w', w + 'px');
    const img = new Image();
    img.src = base + 'assets/crew/' + who.img + '_s.webp';
    img.alt = '';
    img.decoding = 'async';
    el.appendChild(img);
    const bub = document.createElement('div');
    bub.className = 'bubble';
    el.appendChild(bub);
    layer.appendChild(el);
    const b = { who, el, bub, w, h: w, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: (Math.random() - 0.5) * 0.15,
      pinned: !!pinned, state: 'peek', held: false, hover: false, talking: false, talkT: 0, born: performance.now() };
    img.addEventListener('load', () => { b.h = w * img.naturalHeight / img.naturalWidth; });
    bodies.push(b);
    wire(b);
    return b;
  };

  // peek in from an edge (left, right or the bottom), look around, then float in
  const peek = (b) => {
    const W = innerWidth, H = innerHeight;
    const edge = small ? pick(['left', 'right']) : pick(['left', 'right', 'right', 'left', 'bottom']);
    let from, at;
    if (edge === 'left') { const y = rand(H * .25, H * .7); from = [-b.w - 10, y]; at = [-b.w * .42, y]; b.r = 14; }
    else if (edge === 'right') { const y = rand(H * .25, H * .7); from = [W + 10, y]; at = [W - b.w * .58, y]; b.r = -14; }
    else { const x = rand(W * .2, W * .75); from = [x, H + 10]; at = [x, H - b.h * .55]; b.r = rand(-6, 6); }
    b.edge = edge; b.x = from[0]; b.y = from[1];
    b.state = 'peek';
    b.tw = { from, to: at, t0: performance.now(), ms: 700 };
    b.el.classList.add('peeking');
    // look around: a couple of head turns while half in
    setTimeout(() => b.el.classList.add('look'), 700);
    setTimeout(() => {
      b.el.classList.remove('look', 'peeking');
      if (b.state !== 'peek') return;
      b.state = 'float';
      b.tw = null;
      const inward = edge === 'left' ? [1, rand(-.3, .3)] : edge === 'right' ? [-1, rand(-.3, .3)] : [rand(-.4, .4), -1];
      b.vx = inward[0] * rand(.9, 1.4); b.vy = inward[1] * rand(.9, 1.4);
      if (Math.random() < .6) say(b, { kind: 'hello' }, 3200);
      if (!b.pinned) b.leaveAt = performance.now() + rand(8000, 15000);
    }, 700 + 1600);
  };

  // duck back out the nearest side and fade
  const leave = (b) => {
    if (b.state === 'leave' || b.pinned) return;
    b.state = 'leave';
    const W = innerWidth, H = innerHeight;
    const toL = b.x + b.w / 2 < W / 2;
    const to = (H - b.y) < Math.min(b.x, W - b.x) ? [b.x, H + 20] : [toL ? -b.w - 20 : W + 20, b.y];
    b.tw = { from: [b.x, b.y], to, t0: performance.now(), ms: 900 };
    b.el.classList.add('leaving');
    setTimeout(() => { b.el.remove(); bodies.splice(bodies.indexOf(b), 1); }, 950);
  };

  // ---------- Talking ----------
  const say = async (b, ctx, ms = 2600) => {
    if (b.talking || b.asking) return;
    b.talking = true;
    const text = await think(b.who, ctx);
    if (b.asking) { b.talking = false; return; }
    b.bub.textContent = text;
    if (ctx.kind === 'hello' || ctx.kind === 'chat') {
      const a = document.createElement('a');
      a.href = base + 'crew/' + b.who.slug + '/';
      a.textContent = 'Visit ' + b.who.name;
      b.bub.appendChild(a);
      ms = Math.max(ms, 4200);
    }
    b.bub.classList.add('on');
    clearTimeout(b.talkT);
    b.talkT = setTimeout(() => { b.bub.classList.remove('on'); b.talking = false; }, ms);
  };
  JBCrew.say = (slug, text) => { const b = bodies.find((x) => x.who.slug === slug); if (b) { b.bub.textContent = text; b.bub.classList.add('on'); clearTimeout(b.talkT); b.talkT = setTimeout(() => b.bub.classList.remove('on'), 3200); } };

  // tap one: "Want me to stick around?"
  const ask = (b) => {
    if (b.pinned && !only) {
      b.bub.textContent = pick(['Still here.', 'Not going anywhere.', 'You stuck with me now.']);
      b.bub.classList.add('on');
      clearTimeout(b.talkT); b.talkT = setTimeout(() => b.bub.classList.remove('on'), 2400);
      return;
    }
    if (b.pinned) { say(b, { kind: 'hello' }); return; }
    b.asking = true;
    b.leaveAt = Infinity;
    clearTimeout(b.talkT);
    b.bub.innerHTML = '';
    const q = document.createElement('span');
    q.textContent = 'Want me to stick around?';
    const row = document.createElement('span');
    row.className = 'ask';
    const yes = document.createElement('button');
    yes.type = 'button'; yes.textContent = 'Yes, stay';
    const no = document.createElement('button');
    no.type = 'button'; no.className = 'no'; no.textContent = 'Nah';
    row.append(yes, no);
    const visit = document.createElement('a');
    visit.href = base + 'crew/' + b.who.slug + '/';
    visit.textContent = 'Visit ' + b.who.name;
    b.bub.append(q, row, visit);
    b.bub.classList.add('on', 'asking');
    const done = (text, ms) => {
      b.asking = false;
      b.bub.classList.remove('asking');
      b.bub.textContent = text;
      clearTimeout(b.talkT);
      b.talkT = setTimeout(() => { b.bub.classList.remove('on'); b.talking = false; }, ms);
    };
    yes.addEventListener('click', (e) => {
      e.stopPropagation();
      // only one stays: whoever stayed before heads out
      bodies.filter((x) => x.pinned && x !== b && x.who.slug !== only).forEach((x) => { x.pinned = false; x.el.classList.remove('pinned'); leave(x); });
      b.pinned = true;
      b.el.classList.add('pinned');
      try { sessionStorage.setItem('jbCrewStay', b.who.slug); } catch (e2) {}
      done(pick(['Cool. I\'ll hang.', 'Say less. I\'m here.', 'Moving in.']), 2600);
    });
    no.addEventListener('click', (e) => {
      e.stopPropagation();
      done(pick(['Later.', 'Fine. Fine.', 'I know when I\'m not wanted.']), 1400);
      setTimeout(() => leave(b), 1200);
    });
    // nobody answered: carry on
    b.askT = setTimeout(() => { if (b.asking) { done('Guess not.', 1400); b.leaveAt = performance.now() + 4000; } }, 9000);
  };

  // ---------- Grab, throw, tap ----------
  function wire(b) {
    let px = 0, py = 0, lx = 0, ly = 0, lt = 0, moved = 0;
    b.el.addEventListener('pointerdown', (e) => {
      // pointer capture would swallow clicks on the bubble's link and buttons
      if (e.button !== 0 || e.target.closest('a,button')) return;
      if (b.state !== 'float') return;
      b.held = true; moved = 0;
      b.el.classList.add('dragging');
      b.el.setPointerCapture(e.pointerId);
      px = e.clientX - b.x; py = e.clientY - b.y; lx = e.clientX; ly = e.clientY; lt = performance.now();
    });
    b.el.addEventListener('pointermove', (e) => {
      if (!b.held) return;
      const now = performance.now(), dt = Math.max(1, now - lt);
      b.vx = (e.clientX - lx) / dt * 16; b.vy = (e.clientY - ly) / dt * 16;
      moved += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
      lx = e.clientX; ly = e.clientY; lt = now;
      b.x = e.clientX - px; b.y = e.clientY - py;
    });
    const drop = () => {
      if (!b.held) return;
      b.held = false;
      b.el.classList.remove('dragging');
      if (moved < 6) ask(b);
      else say(b, { kind: 'chat' }, 1800);
    };
    b.el.addEventListener('pointerup', drop);
    b.el.addEventListener('pointercancel', drop);
    b.el.addEventListener('mouseenter', () => { b.hover = true; if (!b.held && !b.asking && b.state === 'float') say(b, { kind: 'hello' }); });
    b.el.addEventListener('mouseleave', () => { b.hover = false; });
  }

  // ---------- Who comes by next ----------
  const queue = crew.filter((c) => c.slug !== only && c.slug !== stay).sort(() => Math.random() - 0.5);
  let qi = 0;
  const visitors = () => bodies.filter((b) => !b.pinned && b.state !== 'leave').length;
  const next = () => {
    if (document.hidden || document.body.classList.contains('no-crew') || S.busy()) { setTimeout(next, 4000); return; }
    if (visitors() < MAX) {
      const onScreen = new Set(bodies.map((b) => b.who.slug));
      let who = null;
      for (let k = 0; k < queue.length && !who; k++) { const c = queue[(qi + k) % queue.length]; if (!onScreen.has(c.slug)) { who = c; qi = (qi + k + 1) % queue.length; } }
      if (who) peek(make(who, false));
    }
    // sometimes two overlap (so they can bump), mostly one at a time with a pause in between
    setTimeout(next, small ? rand(9000, 14000) : (visitors() ? rand(5000, 9000) : rand(3000, 6000)));
  };

  // a dance (or another show) starting sends the drop-ins off; whoever was asked to stay keeps to the side
  addEventListener('jb:dance', (e) => { if (e.detail && e.detail.state === 'start') bodies.filter((b) => !b.pinned).forEach(leave); });

  if (reduce) {
    // no motion: whoever stays (or the page's star) stands still in the corner, nobody comes and goes
    const who = bySlug(only) || bySlug(stay);
    if (who) { const b = make(who, true); b.state = 'still'; b.x = 16; b.y = innerHeight - b.w - 90; b.el.style.transform = `translate3d(${b.x}px,${b.y}px,0)`; }
  } else {
    // the page's star, and whoever was asked to stay, come in first
    if (bySlug(only)) peek(make(bySlug(only), true));
    if (stay && stay !== only && bySlug(stay)) setTimeout(() => peek(make(bySlug(stay), true)), only ? 2500 : 300);
    setTimeout(next, only || stay ? rand(9000, 13000) : rand(1500, 3500));
  }

  // ---------- Motion ----------
  let running = true, last = performance.now(), chatter = 0;
  // phones and Lite finish move the crew at 30 frames a second: it looks the same at drifting speed and costs half
  const slow = document.documentElement.classList.contains('lite') || matchMedia('(pointer: coarse)').matches;
  const ease = (k) => 1 - (1 - k) ** 3;
  const step = (now) => {
    if (slow && now - last < 30) { requestAnimationFrame(step); return; }
    const dt = Math.min(48, now - last) / 16; last = now;
    if (running && !document.body.classList.contains('no-crew') && bodies.length) {
      const W = innerWidth, H = innerHeight;
      for (const b of bodies) {
        if (b.tw) {
          const k = Math.min(1, (now - b.tw.t0) / b.tw.ms), e = ease(k);
          b.x = b.tw.from[0] + (b.tw.to[0] - b.tw.from[0]) * e;
          b.y = b.tw.from[1] + (b.tw.to[1] - b.tw.from[1]) * e;
          continue;
        }
        if (b.state !== 'float') continue;
        if (b.leaveAt && now > b.leaveAt && !b.held && !b.hover && !b.talking && !b.asking) { leave(b); continue; }
        if (!b.held && !b.hover && !b.asking) {
          b.vx += (Math.random() - 0.5) * 0.04; b.vy += (Math.random() - 0.5) * 0.04;
          // whoever stays drifts slower, so it doesn't get in the way
          const sp = Math.hypot(b.vx, b.vy), max = b.pinned ? 1.1 : 2.2, min = b.pinned ? 0.15 : 0.25;
          if (sp > max) { b.vx *= 0.96; b.vy *= 0.96; }
          if (sp < min) { b.vx *= 1.15; b.vy *= 1.15; }
          b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
          if (b.x < -b.w * 0.3) { b.x = -b.w * 0.3; b.vx = Math.abs(b.vx); }
          if (b.x > W - b.w * 0.7) { b.x = W - b.w * 0.7; b.vx = -Math.abs(b.vx); }
          if (b.y < 70) { b.y = 70; b.vy = Math.abs(b.vy); }
          if (b.y > H - b.h * 0.8) { b.y = H - b.h * 0.8; b.vy = -Math.abs(b.vy); }
          if (Math.abs(b.r) > 16) b.vr = -b.vr;
        }
      }
      // bump each other
      const fl = bodies.filter((b) => b.state === 'float');
      for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) {
        const a = fl[i], c = fl[j];
        const ax = a.x + a.w / 2, ay = a.y + a.h / 2, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const dx = cx - ax, dy = cy - ay, d = Math.hypot(dx, dy) || 1, min = (a.w + c.w) * 0.38;
        if (d < min) {
          const nx = dx / d, ny = dy / d, push = (min - d) / 2;
          if (!a.held) { a.x -= nx * push; a.y -= ny * push; }
          if (!c.held) { c.x += nx * push; c.y += ny * push; }
          const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rel < 0) { a.vx += rel * nx; a.vy += rel * ny; c.vx -= rel * nx; c.vy -= rel * ny; }
          if (now - chatter > 2600 && !a.talking && !c.talking && !a.asking && !c.asking) {
            chatter = now;
            a.el.classList.remove('bonk'); c.el.classList.remove('bonk'); void a.el.offsetWidth;
            a.el.classList.add('bonk'); c.el.classList.add('bonk');
            say(a, { kind: 'bump', with: c.who }, 2200);
            setTimeout(() => say(c, { kind: 'reply', with: a.who, said: a.bub.textContent }, 2200), 900);
          }
        }
      }
      for (const b of bodies) if (b.state !== 'still') b.el.style.transform = `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) rotate(${b.r.toFixed(1)}deg)`;
    }
    requestAnimationFrame(step);
  };
  if (!reduce) requestAnimationFrame(step);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });

  // someone on screen says something every so often, unprompted
  setInterval(() => { if (!document.hidden && !reduce) { const on = bodies.filter((x) => x.state === 'float' && !x.asking); if (!on.length) return; const b = pick(on); if (!b.held) say(b, { kind: 'chat' }, 2400); } }, 11000);

  // now and then one of them turns real for a few seconds (js/real.js)
  if (!reduce && !document.body.hasAttribute('data-no-real')) {
    const s = document.createElement('script');
    s.src = base + 'js/real.js';
    s.defer = true;
    document.head.appendChild(s);
  }
});
