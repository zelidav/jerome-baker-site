/* The alter ego. Every 20 to 40 seconds the chaos tears away and the same page shows up normalized:
   the same sections in the same order, but pale walls, a neat grid, aligned type, the glass and merch in
   tidy rows and the whole JB Crew standing in a line like a staff photo. A few seconds later it shatters
   and the chaos is back. "Calm down" calls it on purpose; "Stay in the calm version" keeps it (remembered),
   "Bring back the chaos" ends it. While it is up, body.sr-calm pauses the antics and the real morph.
   With sound (after the visitor's first click or key): elevator muzak, a tinny PA "Next floor: streetwear",
   and a ding as the store appears; the muzak fades out on the way back.
   The visit is an elevator ride (about ten seconds): "Going up", then the page glides to the glass floor
   ("Next floor: bongs", ding), holds, glides to the merch floor ("Next floor: streetwear", ding), holds,
   and snaps back to the chaos. Scrolling, clicking or a key during the ride stops the gliding; the ride
   still ends on time unless they chose to stay.
   Needs window.JB_GLASS and window.JB_CREW; window.JB_ANIM for the animated crew's standing frames.
   Test hook: JBSerene.enter('zigzag' | 'pixels'), JBSerene.leave('shatter' | 'slice'). */
(() => {
  const D = window.JB_GLASS;
  const main = document.querySelector('main');
  if (!D || !main) return;
  const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = document.documentElement.dataset.base || '';
  const money = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const byId = Object.fromEntries(D.pieces.map((p) => [p.id, p]));
  const KEY = 'jb-calm';
  const remember = (v) => { try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };
  const stayed = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };

  /* ---------------------------------------------------------------- building the calm page */
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const clean = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const CARDS = '.card, .mcard, .pc, .sc, .pin, .floater, .crew-layer, figure, nav';
  const outside = (n) => !n.parentElement.closest(CARDS);
  const link = (a, cls = 'sr-link') => {
    const x = el('a', cls, clean(a));
    x.href = a.getAttribute('href');
    if (a.target) { x.target = a.target; x.rel = 'noopener'; }
    return x;
  };

  // the glass, in tidy rows: name and price under each
  const glassGrid = (pieces) => {
    const g = el('div', 'sr-grid sr-glass');
    pieces.forEach((p) => {
      const a = el('a', 'sr-item');
      a.href = `${base}glass/#p=${p.id}`;
      const fig = el('span', 'sr-frame');
      const im = el('img');
      im.src = `${base}assets/glass/${p.id}_t.webp`;
      im.alt = p.name;
      im.loading = 'lazy';
      fig.append(im);
      a.append(fig, el('span', 'sr-iname', p.name), el('span', 'sr-iprice', p.status === 'available' ? money(p.price) : p.status === 'sold' ? 'Sold' : 'In a collection'));
      g.append(a);
    });
    return g;
  };
  // the merch cards on the page, tidied: product photo, name, price
  const merchGrid = (cards) => {
    const g = el('div', 'sr-grid sr-merch');
    cards.forEach((c) => {
      const pic = c.querySelector('.pic img') || [...c.querySelectorAll('img')].find((i) => !i.classList.contains('worn'));
      if (!pic) return;
      const a = el('a', 'sr-item');
      a.href = c.getAttribute('href') || '#';
      const fig = el('span', 'sr-frame');
      const im = el('img');
      im.src = pic.currentSrc || pic.src;
      im.alt = pic.alt || '';
      im.loading = 'lazy';
      fig.append(im);
      const pr = c.querySelector('.pr, .price');
      a.append(fig, el('span', 'sr-iname', clean(c.querySelector('h3'))), el('span', 'sr-iprice', clean(pr)));
      g.append(a);
    });
    return g;
  };
  // the whole crew in one even line, same height, facing forward: the staff photo
  const staff = () => {
    const crew = window.JB_CREW || [];
    const anim = window.JB_ANIM || {};
    const row = el('div', 'sr-staff');
    crew.forEach((c) => {
      const f = el('figure', 'sr-member');
      const im = el('img');
      im.src = anim[c.slug] ? `${base}assets/anim/${anim[c.slug].img}/stand.webp` : `${base}assets/crew/${c.img}_m.webp`;
      im.alt = c.name;
      im.loading = 'lazy';
      f.append(im, el('figcaption', null, c.name));
      row.append(f);
    });
    return row;
  };

  // one calm section for each section of the page, in the same order
  const mirror = (sec, i) => {
    const out = el('section', 'sr-sec');
    out.dataset.i = i;
    const isStore = sec.id === 'shelves' || sec.classList.contains('store');
    const isCrew = sec.id === 'crew' || !!sec.querySelector('.pin');
    // a heading-less wall of crew stickers is decoration: the staff photo lives in the crew section
    const collage = !sec.querySelector('h1, h2, h3, p') && sec.querySelectorAll('img[src*="assets/crew/"]').length >= 3;
    if (collage && hasCrew) return null;
    const h = isStore ? null : [...sec.querySelectorAll('h1, h2')].find(outside) || sec.querySelector('.tt-stage') || [...sec.querySelectorAll('h3')].find(outside);
    const kicker = sec.querySelector('.tt-eyebrow');
    if (kicker && kicker !== h) out.append(el('p', 'sr-kicker', clean(kicker)));
    if (h) out.append(el(i === 0 ? 'h1' : 'h2', 'sr-h', clean(h)));
    else if (isStore) out.append(el('h2', 'sr-h', sec.getAttribute('aria-label') || 'The glass'));
    const paras = [...sec.querySelectorAll('p, .tt-sub')].filter((p) => outside(p) && !p.querySelector('a.btn') && clean(p) && !p.closest('[aria-hidden="true"], .sbar, .empty, [hidden], .hint'));
    if (!isStore) paras.slice(0, 2).forEach((p) => out.append(el('p', 'sr-p', clean(p))));

    // what the section actually holds
    const glassLinks = [...sec.querySelectorAll('a[href*="#p=JBD-"]')].map((a) => (a.getAttribute('href').match(/#p=(JBD-[A-F0-9]+)/) || [])[1]).filter((id, k, all) => id && byId[id] && all.indexOf(id) === k);
    const merch = [...sec.querySelectorAll('a.mcard')];
    if (isStore) {
      D.shelves.forEach((s) => {
        const ps = D.pieces.filter((p) => p.shelf === s.key);
        if (!ps.length) return;
        out.append(el('h3', 'sr-sub', s.title), glassGrid(ps));
      });
    } else if (glassLinks.length) {
      out.append(glassGrid(glassLinks.map((id) => byId[id])));
    } else if (merch.length) {
      out.append(merchGrid(merch));
    } else if (isCrew || collage) {
      if (!h) out.append(el('h2', 'sr-h', 'The JB Crew'));
      out.append(staff());
    }
    const story = sec.querySelector('ol.story');
    if (story) {
      const ol = el('ol', 'sr-time');
      story.querySelectorAll('li').forEach((li) => {
        const row = el('li');
        row.append(el('span', 'sr-year', clean(li.querySelector('b'))), el('span', null, clean(li.querySelector('span'))));
        ol.append(row);
      });
      out.append(ol);
    }
    const ul = [...sec.querySelectorAll('ul')].find((u) => outside(u) && u.querySelector('li b'));
    if (ul) {
      const list = el('ul', 'sr-list');
      ul.querySelectorAll('li').forEach((li) => {
        const row = el('li');
        const b = li.querySelector('b');
        row.append(el('b', null, clean(b)), el('span', null, clean(li).replace(clean(b), '').trim()));
        list.append(row);
      });
      out.append(list);
    }
    // photographs of the room and the work, framed and level
    const photos = [...sec.querySelectorAll('figure img, .disc img')].filter((im) => !/assets\/(crew|cut|anim)\//.test(im.getAttribute('src') || ''));
    if (photos.length && !glassLinks.length && !merch.length && !isStore) {
      const g = el('div', 'sr-photos');
      photos.slice(0, 3).forEach((p) => { const f = el('span', 'sr-frame'); const im = el('img'); im.src = p.currentSrc || p.src; im.alt = p.alt || ''; im.loading = 'lazy'; f.append(im); g.append(f); });
      out.append(g);
    }
    const links = [...sec.querySelectorAll('a.btn')].filter(outside).slice(0, 2);
    if (links.length) {
      const row = el('div', 'sr-links');
      links.forEach((a) => row.append(link(a)));
      out.append(row);
    }
    return out.childElementCount ? out : null;
  };

  const room = el('div', 'sr');
  room.hidden = true;
  room.setAttribute('role', 'dialog');
  room.setAttribute('aria-label', 'Jerome Baker, calm version');
  const top = el('header', 'sr-top');
  const brand = el('a', 'sr-brand', 'Jerome Baker');
  brand.href = base || './';
  const nav = el('nav', 'sr-nav');
  nav.setAttribute('aria-label', 'Calm version');
  [['Glass', 'glass/'], ['Merch', 'shop/'], ['The Crew', 'crew/'], ['Visit', 'travel/']].forEach(([t, href]) => { const a = el('a', null, t); a.href = base + href; nav.append(a); });
  const snd = el('button', 'sr-snd', 'Sound on');
  snd.type = 'button';
  top.append(brand, nav, snd);
  const body = el('div', 'sr-body');
  const foot = el('footer', 'sr-foot');
  const stay = el('button', 'sr-stay');
  stay.type = 'button';
  foot.append(el('span', null, 'Hand-blown since 1991. Each piece is one of one.'), stay);
  room.append(top, body, foot);
  document.body.appendChild(room);

  let sections = [], hasCrew = false;
  const build = () => {
    sections = [...main.querySelectorAll(':scope > section')];
    hasCrew = sections.some((s) => s.id === 'crew' || s.querySelector('.pin'));
    const parts = sections.map(mirror).filter(Boolean);
    if (!parts.some((x) => x.querySelector('.sr-merch')) && window.JB_CREW) {
      const seen = new Set(), items = [];
      window.JB_CREW.forEach((c) => (c.wear || []).forEach((m) => { if (!seen.has(m.id)) { seen.add(m.id); items.push(m); } }));
      const s = el('section', 'sr-sec');
      const g = el('div', 'sr-grid sr-merch');
      items.slice(0, 10).forEach((m) => {
        const a = el('a', 'sr-item');
        a.href = `${base}shop/#p=${encodeURIComponent(m.slug)}`;
        const f = el('span', 'sr-frame'), im = el('img');
        im.src = `${base}assets/merch/${m.id}.webp`; im.alt = m.name; im.loading = 'lazy';
        f.append(im);
        a.append(f, el('span', 'sr-iname', m.name), el('span', 'sr-iprice', money(m.price)));
        g.append(a);
      });
      s.append(el('h2', 'sr-h', 'Ritual merch'), el('p', 'sr-p', 'Real gear, shipping now.'), g);
      parts.push(s);
    }
    if (!hasCrew && window.JB_CREW) {
      // pages without a crew section still get the staff, lined up at the end
      const s = el('section', 'sr-sec');
      s.append(el('h2', 'sr-h', 'The JB Crew'), el('p', 'sr-p', 'The staff. Every one of them is on the clock.'), staff());
      parts.push(s);
    }
    body.replaceChildren(...parts);
  };
  // the floors of the ride: the glass (the first series group when the page has them, else the biggest
  // glass section), then the first merch section
  const floors = () => {
    const glass = [...body.querySelectorAll('.sr-glass')].sort((a, b) => b.childElementCount - a.childElementCount)[0];
    const sub = body.querySelector('.sr-sub');
    const merch = body.querySelector('.sr-merch');
    return [glass && { line: 'bongs', at: sub || glass.closest('.sr-sec') }, merch && { line: 'floor', at: merch.closest('.sr-sec') }].filter(Boolean);
  };
  const yOf = (at) => Math.max(0, Math.min(at.offsetTop - top.offsetHeight - (at.classList.contains('sr-sub') ? 28 : -1), room.scrollHeight - room.clientHeight));
  // a smooth glide that a visitor can interrupt at any point
  let glideRaf = 0;
  const glide = (to, ms) => new Promise((done) => {
    cancelAnimationFrame(glideRaf);
    const from = room.scrollTop, t0 = performance.now();
    if (calmMotion || Math.abs(to - from) < 2) { room.scrollTop = to; done(); return; }
    const frame = (now) => {
      if (!riding) { done(); return; }
      const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      room.scrollTop = from + (to - from) * e;
      if (k < 1) glideRaf = requestAnimationFrame(frame); else done();
    };
    glideRaf = requestAnimationFrame(frame);
  });
  const HOLD = 3600;
  let riding = false, rideId = 0;
  const log = [];
  const cue = (what) => log.push({ what, t: Math.round(performance.now()), y: Math.round(room.scrollTop) });
  async function ride() {
    const id = ++rideId;
    riding = true;
    const alive = () => riding && id === rideId && !room.hidden;
    await wait(900);
    for (const f of floors()) {
      if (!alive()) return;
      cue('glide:' + f.line);
      await glide(yOf(f.at), 1300);
      if (!alive()) return;
      ding();
      announce(f.line, .45);
      cue('arrive:' + f.line);
      await wait(HOLD);
    }
  }
  // a visitor taking the wheel ends the ride's gliding (never their own scrolling)
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((t) => room.addEventListener(t, () => { if (riding) { riding = false; cancelAnimationFrame(glideRaf); cue('visitor'); } }, { passive: true }));

  /* ---------------------------------------------------------------- sound */
  const SND = 'jb-calm-sound';
  let soundOn = true;
  try { soundOn = localStorage.getItem(SND) !== 'off'; } catch (e) { /* storage blocked */ }
  let actx = null, unlocked = false, muzak = null;
  const buffers = {};
  const audioCtx = () => {
    if (!unlocked || !soundOn) return null;
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  };
  const load = async (name) => {
    const c = audioCtx();
    if (!c) return null;
    if (!buffers[name]) buffers[name] = fetch(`${base}serene/audio/${name}.mp3`).then((r) => r.arrayBuffer()).then((b) => c.decodeAudioData(b));
    try { return await buffers[name]; } catch (e) { return null; }
  };
  // the store's music: quiet, looping, fading in and out
  async function music(on) {
    const c = audioCtx();
    if (!on) {
      if (muzak && actx) { const { src, g } = muzak; muzak = null; g.gain.setTargetAtTime(.0001, actx.currentTime, .12); src.stop(actx.currentTime + .6); }
      return;
    }
    if (!c || muzak) return;
    const buf = await load('muzak');
    if (!buf || muzak || room.hidden) return;
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; src.loop = true;
    g.gain.setValueAtTime(.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.32, c.currentTime + .8);
    src.connect(g).connect(c.destination);
    src.start();
    muzak = { src, g };
  }
  // the PA: the voice squeezed through a cheap ceiling speaker
  async function announce(name = 'floor', delay = .15) {
    const c = audioCtx();
    const buf = c && await load(name);
    if (!buf) return;
    const src = c.createBufferSource(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), sh = c.createWaveShaper(), g = c.createGain();
    hp.type = 'highpass'; hp.frequency.value = 500;
    lp.type = 'lowpass'; lp.frequency.value = 3000;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    sh.curve = curve;
    g.gain.value = .9;
    src.buffer = buf;
    src.connect(hp).connect(lp).connect(sh).connect(g).connect(c.destination);
    src.start(c.currentTime + delay);
  }
  // the elevator ding: two soft bell tones, high then low
  function ding() {
    const c = audioCtx();
    if (!c) return;
    [[1318.5, 0], [1046.5, .28]].forEach(([f, dt]) => {
      const t = c.currentTime + dt;
      [[f, .22], [f * 2.01, .05], [f * 3.02, .02]].forEach(([hz, v]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = hz;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + .008);
        g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
        o.connect(g).connect(c.destination);
        o.start(t); o.stop(t + 1.5);
      });
    });
  }
  const paintSnd = () => { snd.setAttribute('aria-pressed', soundOn); snd.textContent = soundOn ? 'Sound on' : 'Sound off'; };
  paintSnd();
  snd.addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SND, soundOn ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
    paintSnd();
    if (soundOn && !room.hidden) music(true); else music(false);
  });
  // browsers only allow sound after a gesture: the first automatic visit can be silent, later ones play
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    if (!room.hidden && mode === 'calm') music(true);
  };
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);

  /* ---------------------------------------------------------------- ways in */
  const W = () => innerWidth, H = () => innerHeight;
  // a jagged tear that rips down the screen
  const zigzag = (ms) => new Promise((done) => {
    const teeth = 18, amp = H() * .05, t0 = performance.now();
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      const y = -amp * 2 + e * (H() + amp * 4);
      const pts = ['0px 0px', `${W()}px 0px`];
      for (let i = teeth; i >= 0; i--) pts.push(`${(W() * i) / teeth}px ${y + (i % 2 ? amp : -amp)}px`);
      room.style.clipPath = `polygon(${pts.join(',')})`;
      if (k < 1) requestAnimationFrame(frame); else { room.style.clipPath = ''; done(); }
    };
    requestAnimationFrame(frame);
  });
  // square blocks that blink in at random until the page is whole
  const pixels = (ms) => new Promise((done) => {
    const size = Math.max(48, Math.round(Math.min(W(), H()) / 9));
    const cols = Math.ceil(W() / size), rows = Math.ceil(H() / size);
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(`M${c * size} ${r * size}h${size}v${size}h-${size}z`);
    for (let i = cells.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [cells[i], cells[j]] = [cells[j], cells[i]]; }
    const t0 = performance.now();
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const n = Math.ceil(cells.length * k * k);
      room.style.clipPath = `path('${cells.slice(0, n).join('') || 'M0 0z'}')`;
      if (k < 1) requestAnimationFrame(frame); else { room.style.clipPath = ''; done(); }
    };
    requestAnimationFrame(frame);
  });

  /* ---------------------------------------------------------------- ways out */
  // copies of the calm page, cut into pieces, each flying off on its own
  const blowApart = async (shapes, fling, ms) => {
    const at = room.scrollTop;
    const shards = shapes.map((clip) => {
      const s = room.cloneNode(true);
      s.removeAttribute('role'); s.removeAttribute('aria-label'); s.setAttribute('aria-hidden', 'true');
      s.className = 'sr sr-shard';
      s.style.clipPath = clip;
      s.querySelectorAll('button,a').forEach((x) => x.setAttribute('tabindex', '-1'));
      document.body.appendChild(s);
      s.scrollTop = at;
      return s;
    });
    room.hidden = true;
    await Promise.all(shards.map((s, i) => s.animate(fling(i), { duration: ms, easing: 'cubic-bezier(.5,0,.9,.4)', fill: 'forwards' }).finished));
    shards.forEach((s) => s.remove());
  };
  // glass shatter: wedges from a point near the middle, thrown outward and spinning
  const shatter = () => {
    const cx = W() * rand(.4, .6), cy = H() * rand(.4, .6), n = 14;
    const edge = (a) => {
      const dx = Math.cos(a), dy = Math.sin(a);
      const t = Math.min(dx ? (dx > 0 ? W() - cx : -cx) / dx : Infinity, dy ? (dy > 0 ? H() - cy : -cy) / dy : Infinity);
      return [cx + dx * t * 1.2, cy + dy * t * 1.2];
    };
    const angles = Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 + rand(-.12, .12));
    const shapes = angles.map((a, i) => {
      const b = angles[(i + 1) % n] + (i === n - 1 ? Math.PI * 2 : 0);
      const [x1, y1] = edge(a), [x2, y2] = edge((a + b) / 2), [x3, y3] = edge(b);
      return `polygon(${cx}px ${cy}px,${x1}px ${y1}px,${x2}px ${y2}px,${x3}px ${y3}px)`;
    });
    return blowApart(shapes, (i) => {
      const a = (angles[i] + angles[(i + 1) % n]) / 2, d = Math.max(W(), H()) * rand(.7, 1.2);
      return [{ transform: 'none', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + H() * .3}px) rotate(${rand(-120, 120)}deg) scale(${rand(.6, 1)})`, opacity: .2 }];
    }, 700);
  };
  // glitch slice: horizontal strips that snap off sideways in RGB-split jerks
  const slice = () => {
    const n = 9, h = H() / n;
    const shapes = Array.from({ length: n }, (_, i) => `inset(${i * h}px 0 ${H() - (i + 1) * h}px 0)`);
    return blowApart(shapes, (i) => {
      const dir = i % 2 ? 1 : -1, d = W() * rand(1, 1.4) * dir;
      return [{ transform: 'none', filter: 'none' }, { transform: `translateX(${d * .08}px)`, filter: 'drop-shadow(6px 0 0 #DA2342) drop-shadow(-6px 0 0 #05B48F)', offset: .25 },
        { transform: `translateX(${d * .05}px)`, offset: .4 }, { transform: `translateX(${d}px) skewX(${dir * 20}deg)`, filter: 'hue-rotate(180deg)' }];
    }, 520);
  };
  const flash = async () => {
    const f = el('div', 'sr-flash');
    document.body.appendChild(f);
    await f.animate([{ opacity: .9 }, { opacity: 0 }], { duration: 260 }).finished;
    f.remove();
  };

  /* ---------------------------------------------------------------- the moments */
  let busy = false, mode = 'chaos', holdT = 0, ins = 0, outs = 0;
  const label = () => { stay.textContent = mode === 'calm' ? 'Bring back the chaos' : 'Stay in the calm version'; };
  // the page underneath stops scrolling, and the antics and the real morph stand down
  const lock = (on) => {
    document.documentElement.style.overflow = on ? 'hidden' : '';
    document.body.classList.toggle('sr-calm', on);
  };

  async function enter(kind) {
    if (busy || !room.hidden) return;
    busy = true;
    build();
    document.body.classList.add('sr-jolt');
    await wait(220);
    document.body.classList.remove('sr-jolt');
    room.hidden = false;
    room.scrollTop = 0;
    lock(true);
    music(true);
    announce('up');
    cue('enter');
    if (calmMotion) await room.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }).finished;
    else await (kind === 'pixels' || (!kind && ins % 2) ? pixels(650) : zigzag(520));
    ding();
    ins++;
    label();
    busy = false;
  }
  async function leave(kind) {
    if (busy || room.hidden) return;
    busy = true;
    clearTimeout(holdT);
    riding = false;
    cancelAnimationFrame(glideRaf);
    music(false);
    cue('leave');
    if (calmMotion) { await room.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).finished; room.hidden = true; }
    else { flash(); await (kind === 'slice' || (!kind && outs % 2) ? slice() : shatter()); }
    outs++;
    lock(false);
    busy = false;
  }
  // the automatic kind: in, a few seconds of calm, then back out
  async function moment() {
    if (busy || !room.hidden) return;
    await enter();
    ride();
    const total = 900 + floors().length * (1300 + HOLD);
    holdT = setTimeout(() => { if (mode === 'chaos') leave(); }, total);
  }

  stay.addEventListener('click', async () => {
    if (mode === 'chaos') {
      // keep it: no more timer
      mode = 'calm';
      clearTimeout(holdT);
      riding = false;
      remember(true);
      label();
    } else {
      mode = 'chaos';
      remember(false);
      await leave('shatter');
      schedule();
    }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !room.hidden && mode === 'chaos') leave(); });

  const call = el('button', 'sr-call', 'Calm down');
  call.type = 'button';
  call.addEventListener('click', moment);
  document.body.appendChild(call);

  let next = 0;
  const schedule = () => { next = performance.now() + rand(20000, 40000); };
  setInterval(() => {
    if (mode !== 'chaos' || busy || !room.hidden || document.hidden || performance.now() < next) return;
    if (document.querySelector('dialog[open]')) { next += 5000; return; }
    schedule();
    moment();
  }, 1000);

  if (stayed()) {
    // they chose calm last time: open straight into it
    mode = 'calm';
    addEventListener('load', () => { build(); room.hidden = false; lock(true); label(); }, { once: true });
  } else {
    next = performance.now() + rand(9000, 14000);
  }
  window.JBSerene = { enter, leave, moment, log };
})();
