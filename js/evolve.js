(() => {
  // The trip evolves. First it says what it is, then the words dissolve and it keeps
  // getting stranger: the crew drifts in, more mirrors, breathing, crew mandalas, melting color.
  // After the last stage it never settles; it keeps mutating at random.
  const body = document.body;
  const trip = document.getElementById('trip');
  const center = document.getElementById('center');
  const say = document.getElementById('say');
  const fx = document.getElementById('fx');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const crew = window.JB_CREW || [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const paused = () => body.classList.contains('calm') || document.hidden;
  const hold = async (ms) => { let t = 0; while (t < ms) { await wait(250); if (!paused()) t += 250; } };

  // ---------- words that build and fall apart ----------
  const show = async (text, color, size) => {
    say.textContent = '';
    say.style.color = color || '#fff';
    say.style.fontSize = size || '';
    const chars = [];
      text.split(' ').forEach((word, wi) => {
        if (wi) say.appendChild(document.createTextNode(' '));
        const w = document.createElement('span'); w.style.whiteSpace = 'nowrap'; w.style.display = 'inline-block';
        [...word].forEach((c) => { const s = document.createElement('span'); s.className = 'ch pre'; s.textContent = c; w.appendChild(s); chars.push(s); });
        say.appendChild(w);
      });
    await wait(40);
    for (let i = 0; i < chars.length; i++) { chars[i].classList.remove('pre'); if (i % 2) await wait(22); }
    return chars;
  };
  const scatter = async (chars) => {
    chars.forEach((s) => { s.style.setProperty('--dx', rnd(-260, 260) + 'px'); s.style.setProperty('--dy', rnd(-220, 220) + 'px'); s.style.setProperty('--rr', rnd(-180, 180) + 'deg'); });
    for (let i = 0; i < chars.length; i++) { chars[i].classList.add('out'); if (i % 3 === 0) await wait(16); }
    await wait(1100);
    say.textContent = '';
  };
  const line = async (text, ms = 2600, color, size) => { const c = await show(text, color, size); await hold(ms); await scatter(c); };

  const INTRO = [
    'This is the Jerome Baker Travel Guide.',
    "It's here for when you're tripping.",
    'Put it on the biggest screen you have.',
    'Lie back. You can leave it on all night.',
    'It never plays the same way twice.',
    'The longer it runs, the weirder it gets.',
    'Start your trip here.'
  ];
  const DRIFT = ['fumed', 'melting', 'breathe in', 'wig-wag', 'breathe out', 'dichroic', 'you are the glass', 'the walls are fine', 'reticello', 'colors have sounds', 'one of one', 'the crew is here', 'drink some water', 'opal', 'nothing is wrong', 'est. 1991', 'keep going', 'look how far you came'];
  const COLS = ['#FFF100', '#FFFFFF', '#FDB514', '#05B48F', '#FF7AB6', '#7FE7FF', '#DA2342'];

  // ---------- stages ----------
  const knob = (o) => window.JBTrip && window.JBTrip.set(o);
  const crewIn = () => body.classList.add('crew-in');
  const breathe = () => body.classList.add('breathing');
  const mandala = () => {
    if (!crew.length || fx.querySelector('.mandala')) return;
    const ring = (n, r, size, dur, rev) => {
      const m = document.createElement('div');
      m.className = 'mandala';
      m.style.animationDuration = dur + 's';
      if (rev) m.style.animationDirection = 'reverse';
      const who = pick(crew);
      for (let i = 0; i < n; i++) {
        const img = new Image();
        img.src = '../assets/crew/' + who.img + '.webp';
        img.alt = '';
        img.style.cssText = `width:${size}px;transform:rotate(${i * 360 / n}deg) translateY(-${r}vmin) rotate(${i % 2 ? 180 : 0}deg)`;
        m.appendChild(img);
      }
      fx.appendChild(m);
      return m;
    };
    ring(12, 34, 90, 60, false);
    ring(8, 18, 70, 40, true);
    // swap who's in the rings now and then
    setInterval(() => {
      if (paused()) return;
      fx.querySelectorAll('.mandala').forEach((m) => { const who = pick(crew); m.querySelectorAll('img').forEach((i) => { i.src = '../assets/crew/' + who.img + '.webp'; }); });
    }, 26000);
  };
  const melt = () => body.classList.add('melting');
  const invert = () => body.classList.add('inverting');

  const mutate = () => {
    knob({ seg: pick([8, 12, 16, 20, 24, 32]), spd: rnd(0.6, 3.2), zoom: rnd(0.8, 1.6) });
    body.classList.toggle('melting', Math.random() < 0.6);
    body.classList.toggle('inverting', Math.random() < 0.35);
    body.classList.toggle('breathing', Math.random() < 0.7);
    body.style.setProperty('--hue-speed', rnd(4, 20).toFixed(1) + 's');
    if (Math.random() < 0.3) fx.querySelectorAll('.mandala').forEach((m) => { m.style.animationDuration = rnd(12, 70).toFixed(0) + 's'; });
  };

  const run = async () => {
    if (reduce) { center.classList.remove('intro-mode'); return; }
    const intro = document.getElementById('intro');
    while (intro && !intro.hidden && !intro.classList.contains('gone')) await wait(300);
    await hold(1200);
    for (const t of INTRO) await line(t, 2400);
    center.classList.add('gone');                        // the headline clears out; it's just the trip now
    const stages = [
      () => { crewIn(); },
      () => knob({ seg: 16, spd: 1.6 }),
      () => { breathe(); },
      () => { mandala(); knob({ seg: 20, zoom: 1.2 }); },
      () => { melt(); knob({ spd: 2.4 }); },
      () => { invert(); knob({ seg: 24 }); }
    ];
    let k = 0, si = 0, lastStage = performance.now();
    for (;;) {
      if (paused()) { await wait(500); continue; }
      const gap = 32000 - Math.min(16000, si * 2500);     // stages come a little faster as it goes
      if (performance.now() - lastStage > gap) {
        lastStage = performance.now();
        if (si < stages.length) stages[si++](); else mutate();
      }
      const w = DRIFT[k++ % DRIFT.length];
      await line(w, 1400 + Math.random() * 1200, pick(COLS), rnd(36, 110).toFixed(0) + 'px');
      await hold(rnd(1500, 5000));
    }
  };
  if (trip) run();
})();
