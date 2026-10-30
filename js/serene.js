/* The alter ego. Every 20 to 40 seconds the chaos tears away and a calm museum room shows one piece of
   glass on a plinth. A few seconds later the room shatters and the chaos is back. "Calm down" calls it
   on purpose; "Stay in the calm version" keeps it, and "Bring back the chaos" ends it. Needs window.JB_GLASS.
   With sound (after the visitor's first click or key): elevator muzak under the calm room, a tinny PA
   "Next floor: streetwear", and a ding as the store appears; the muzak fades out on the way back.
   Test hook: JBSerene.enter('zigzag' | 'pixels'), JBSerene.leave('shatter' | 'slice'). */
(() => {
  const D = window.JB_GLASS;
  if (!D) return;
  const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = document.documentElement.dataset.base || '';
  const money = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const KEY = 'jb-calm';
  const remember = (v) => { try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };
  const stayed = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };

  // the pieces worth putting on a plinth: available, and the serious ones first
  const pool = D.pieces.filter((p) => p.status === 'available' && p.price >= 500);
  let idx = Math.floor(Math.random() * pool.length);

  /* ---------------------------------------------------------------- the calm room */
  const room = document.createElement('div');
  room.className = 'sr';
  room.hidden = true;
  room.setAttribute('role', 'dialog');
  room.setAttribute('aria-label', 'Jerome Baker, calm version');
  room.innerHTML = `
<div class="sr-top"><span class="sr-brand">Jerome Baker</span><nav class="sr-nav" aria-label="Calm version"><span>Glass</span><span>Merch</span><span>Provenance</span><span>Visit</span></nav><button type="button" class="sr-snd" aria-pressed="true">Sound on</button></div>
<div class="sr-room">
  <div class="sr-exhibit"><img class="sr-piece" alt=""><div class="sr-plinth" aria-hidden="true"></div></div>
  <div class="sr-card">
    <p class="sr-kicker"></p>
    <h2 class="sr-name"></h2>
    <p class="sr-meta"></p>
    <p class="sr-price"></p>
    <a class="sr-buy" target="_blank" rel="noopener"></a>
    <div class="sr-arrows" hidden><button type="button" data-d="-1" aria-label="Previous piece">‹</button><button type="button" data-d="1" aria-label="Next piece">›</button></div>
  </div>
</div>
<div class="sr-foot"><span>Hand-blown since 1991. Each piece is one of one.</span><button type="button" class="sr-stay"></button></div>`;
  document.body.appendChild(room);
  const $ = (s) => room.querySelector(s);

  const show = (p) => {
    const img = $('.sr-piece');
    img.src = `${base}assets/glass/${p.id}.webp`;
    img.alt = `${p.name}, hand-blown Jerome Baker glass`;
    $('.sr-kicker').textContent = (p.series || 'Glass').toUpperCase();
    $('.sr-name').textContent = p.name;
    $('.sr-meta').textContent = [p.edition || '1 of 1', p.inches && `${p.inches} inches`, 'Borosilicate glass'].filter(Boolean).join(' · ');
    $('.sr-price').textContent = money(p.price);
    const buy = $('.sr-buy');
    buy.textContent = p.online ? 'Buy' : 'Inquire';
    buy.href = p.online ? p.buy : `mailto:sales@jeromebakerny.com?subject=${encodeURIComponent(`${p.name} (${p.id})`)}`;
  };
  room.querySelector('.sr-arrows').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    idx = (idx + Number(b.dataset.d) + pool.length) % pool.length;
    show(pool[idx]);
  });

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
  async function announce() {
    const c = audioCtx();
    const buf = c && await load('floor');
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
    src.start(c.currentTime + .15);
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
  const sndBtn = $('.sr-snd');
  const paintSnd = () => { sndBtn.setAttribute('aria-pressed', soundOn); sndBtn.textContent = soundOn ? 'Sound on' : 'Sound off'; };
  paintSnd();
  sndBtn.addEventListener('click', () => {
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
  // square blocks that blink in at random until the room is whole
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
  // copies of the room cut into pieces, each flying off on its own
  const blowApart = async (shapes, fling, ms) => {
    const shards = shapes.map((clip) => {
      const s = room.cloneNode(true);
      s.removeAttribute('role'); s.removeAttribute('aria-label'); s.setAttribute('aria-hidden', 'true');
      s.className = 'sr sr-shard';
      s.style.clipPath = clip;
      s.querySelectorAll('button,a').forEach((x) => x.setAttribute('tabindex', '-1'));
      document.body.appendChild(s);
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
    const f = document.createElement('div');
    f.className = 'sr-flash';
    document.body.appendChild(f);
    await f.animate([{ opacity: .9 }, { opacity: 0 }], { duration: 260 }).finished;
    f.remove();
  };

  /* ---------------------------------------------------------------- the moments */
  let busy = false, mode = 'chaos', holdT = 0, ins = 0, outs = 0;
  const label = () => { $('.sr-stay').textContent = mode === 'calm' ? 'Bring back the chaos' : 'Stay in the calm version'; };
  const lock = (on) => { document.documentElement.style.overflow = on ? 'hidden' : ''; };

  async function enter(kind) {
    if (busy || !room.hidden) return;
    busy = true;
    show(pool[idx = (idx + 1) % pool.length]);
    document.body.classList.add('sr-jolt');
    await wait(220);
    document.body.classList.remove('sr-jolt');
    room.hidden = false;
    lock(true);
    music(true);
    announce();
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
    music(false);
    if (calmMotion) { await room.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).finished; room.hidden = true; }
    else { flash(); await (kind === 'slice' || (!kind && outs % 2) ? slice() : shatter()); }
    outs++;
    lock(false);
    busy = false;
  }
  // the automatic kind: in, a few seconds of calm, then back out
  async function moment() {
    await enter();
    if (mode !== 'chaos') return;
    holdT = setTimeout(() => { if (mode === 'chaos') leave(); }, rand(2500, 3800));
  }

  $('.sr-stay').addEventListener('click', async () => {
    if (mode === 'chaos') {
      // keep it: no more timer, add a way to browse the pieces
      mode = 'calm';
      clearTimeout(holdT);
      remember(true);
      room.querySelector('.sr-arrows').hidden = false;
      label();
    } else {
      mode = 'chaos';
      remember(false);
      room.querySelector('.sr-arrows').hidden = true;
      await leave('shatter');
      schedule();
    }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !room.hidden && mode === 'chaos') leave(); });

  const call = document.createElement('button');
  call.type = 'button';
  call.className = 'sr-call';
  call.textContent = 'Calm down';
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
    show(pool[idx]);
    room.hidden = false;
    room.querySelector('.sr-arrows').hidden = false;
    lock(true);
    label();
  } else {
    next = performance.now() + rand(9000, 14000);
  }
  window.JBSerene = { enter, leave, moment };
})();
