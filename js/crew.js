(() => {
  // The JB Crew floats over every page. They drift, bounce off the edges and each other,
  // talk when they bump, and can be grabbed and thrown. Needs window.JB_CREW (js/crew-data.js).
  const crew = window.JB_CREW;
  if (!crew || !crew.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = document.documentElement.dataset.base || '';      // '' at root, '../' or '../../' below
  const only = document.body.dataset.crewSelf || '';               // on a crew page, that member is the star

  // ---------- Brain ----------
  // Swap this for a model later: JBCrew.brain = async (who, ctx) => 'text'
  // ctx = { kind: 'hello' | 'bump' | 'reply' | 'chat', with: otherMember?, said: string?, page: location.pathname }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const cannedBrain = async (who, ctx) => {
    if (ctx.kind === 'bump' && ctx.with) return pick([`Watch it, ${ctx.with.name}.`, `Oh hey ${ctx.with.name}.`, `${ctx.with.name}! Nice ${pick(['hat', 'fit', 'shoes', 'energy'])}.`, ...who.lines]);
    if (ctx.kind === 'reply' && ctx.with) return pick(['Sorry. Sorry.', 'My bad.', 'You bumped me.', 'Again?', ...who.lines]);
    return pick(who.lines);
  };
  window.JBCrew = window.JBCrew || {};
  JBCrew.brain = JBCrew.brain || cannedBrain;
  const think = async (who, ctx) => { try { return await JBCrew.brain(who, { page: location.pathname, ...ctx }); } catch (e) { return cannedBrain(who, ctx); } };

  // ---------- Layer ----------
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
  document.body.appendChild(toggle);
  let saved = '';
  try { saved = localStorage.getItem('jbNoCrew') || ''; } catch (e) {}
  setHidden(!!saved);

  const small = innerWidth < 720;
  const count = Math.max(1, Math.min(crew.length, Number(document.body.dataset.crewCount) || (small ? 3 : 6)));
  const pool = crew.filter((c) => c.slug !== only).sort(() => Math.random() - 0.5);
  const cast = (only ? [crew.find((c) => c.slug === only)].filter(Boolean) : []).concat(pool).slice(0, count);

  const bodies = cast.map((who, i) => {
    const el = document.createElement('div');
    el.className = 'floater';
    const w = Math.round((small ? 84 : 120) + Math.random() * (small ? 30 : 50));
    el.style.setProperty('--w', w + 'px');
    const img = new Image();
    img.src = base + 'assets/crew/' + who.img + '.webp';
    img.alt = '';
    img.decoding = 'async';
    el.appendChild(img);
    const bub = document.createElement('div');
    bub.className = 'bubble';
    el.appendChild(bub);
    layer.appendChild(el);
    const b = {
      who, el, bub, w, h: w,
      x: Math.random() * (innerWidth - w), y: Math.random() * (innerHeight - w),
      vx: (Math.random() - 0.5) * 0.9, vy: (Math.random() - 0.5) * 0.9,
      r: Math.random() * 20 - 10, vr: (Math.random() - 0.5) * 0.2,
      talkT: 0, held: false
    };
    img.addEventListener('load', () => { b.h = w * img.naturalHeight / img.naturalWidth; });
    return b;
  });

  // ---------- Talking ----------
  const say = async (b, ctx, ms = 2600) => {
    if (b.talking) return;
    b.talking = true;
    const text = await think(b.who, ctx);
    b.bub.textContent = text;
    if (ctx.kind === 'hello' || ctx.kind === 'chat') {
      const a = document.createElement('a');
      a.href = base + 'crew/' + b.who.slug + '/';
      a.textContent = 'VISIT ' + b.who.name.toUpperCase() + ' →';
      b.bub.appendChild(a);
      ms = Math.max(ms, 4200);
    }
    b.bub.classList.add('on');
    clearTimeout(b.talkT);
    b.talkT = setTimeout(() => { b.bub.classList.remove('on'); b.talking = false; }, ms);
  };
  JBCrew.say = (slug, text) => { const b = bodies.find((x) => x.who.slug === slug); if (b) { b.bub.textContent = text; b.bub.classList.add('on'); clearTimeout(b.talkT); b.talkT = setTimeout(() => b.bub.classList.remove('on'), 3200); } };
  JBCrew.bodies = bodies;

  // ---------- Grab and throw ----------
  bodies.forEach((b) => {
    let px = 0, py = 0, lx = 0, ly = 0, lt = 0, moved = 0;
    b.el.addEventListener('pointerdown', (e) => {
      // pointer capture would swallow the click on the VISIT link, so leave links alone
      if (e.button !== 0 || e.target.closest('a')) return;
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
      const link = b.bub.classList.contains('on') && b.bub.querySelector('a');
      if (moved < 6 && link) location.href = link.href;   // bubble already up: a tap goes to their page
      else if (moved < 6) say(b, { kind: 'hello' });     // otherwise a tap is a hello
      else say(b, { kind: 'chat' }, 1800);
    };
    b.el.addEventListener('pointerup', drop);
    b.el.addEventListener('pointercancel', drop);
    b.el.addEventListener('mouseenter', () => { b.hover = true; if (!b.held) say(b, { kind: 'hello' }); });
    b.el.addEventListener('mouseleave', () => { b.hover = false; });  // hold still while someone reaches for the link
  });

  // ---------- Physics ----------
  let running = true, last = performance.now(), chatter = 0;
  const step = (now) => {
    const dt = Math.min(48, now - last) / 16; last = now;
    if (running && !document.body.classList.contains('no-crew')) {
      const W = innerWidth, H = innerHeight;
      for (const b of bodies) {
        if (!b.held && !b.hover) {
          b.vx += (Math.random() - 0.5) * 0.04; b.vy += (Math.random() - 0.5) * 0.04;
          const sp = Math.hypot(b.vx, b.vy), max = 2.4, min = 0.25;
          if (sp > max) { b.vx *= 0.96; b.vy *= 0.96; }
          if (sp < min) { b.vx *= 1.15; b.vy *= 1.15; }
          b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
          if (b.x < -b.w * 0.3) { b.x = -b.w * 0.3; b.vx = Math.abs(b.vx); }
          if (b.x > W - b.w * 0.7) { b.x = W - b.w * 0.7; b.vx = -Math.abs(b.vx); }
          if (b.y < -b.h * 0.2) { b.y = -b.h * 0.2; b.vy = Math.abs(b.vy); }
          if (b.y > H - b.h * 0.8) { b.y = H - b.h * 0.8; b.vy = -Math.abs(b.vy); }
          if (Math.abs(b.r) > 18) b.vr = -b.vr;
        }
      }
      // bump each other
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], c = bodies[j];
        const ax = a.x + a.w / 2, ay = a.y + a.h / 2, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const dx = cx - ax, dy = cy - ay, d = Math.hypot(dx, dy) || 1, min = (a.w + c.w) * 0.38;
        if (d < min) {
          const nx = dx / d, ny = dy / d, push = (min - d) / 2;
          if (!a.held) { a.x -= nx * push; a.y -= ny * push; }
          if (!c.held) { c.x += nx * push; c.y += ny * push; }
          const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rel < 0) { a.vx += rel * nx; a.vy += rel * ny; c.vx -= rel * nx; c.vy -= rel * ny; }
          if (now - chatter > 2600 && !a.talking && !c.talking) {
            chatter = now;
            a.el.classList.remove('bonk'); c.el.classList.remove('bonk'); void a.el.offsetWidth;
            a.el.classList.add('bonk'); c.el.classList.add('bonk');
            say(a, { kind: 'bump', with: c.who }, 2200);
            setTimeout(() => say(c, { kind: 'reply', with: a.who, said: a.bub.textContent }, 2200), 900);
          }
        }
      }
      for (const b of bodies) b.el.style.transform = `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) rotate(${b.r.toFixed(1)}deg)`;
    }
    requestAnimationFrame(step);
  };
  if (reduce) {
    bodies.forEach((b, i) => { b.x = 16 + i * (b.w + 10); b.y = innerHeight - b.w - 70; b.el.style.transform = `translate3d(${b.x}px,${b.y}px,0)`; });
  } else {
    requestAnimationFrame(step);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });

  // someone says something every so often, unprompted
  setInterval(() => { if (!document.hidden && !reduce) { const b = pick(bodies); if (!b.held) say(b, { kind: 'chat' }, 2400); } }, 9000);
})();
