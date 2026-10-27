(() => {
  // "Coming soon" for anything that would buy
  const toast = document.getElementById('toast');
  let t;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(t);
    t = setTimeout(() => toast.classList.remove('show'), 2600);
  };
  document.querySelectorAll('.js-soon').forEach((b) =>
    b.addEventListener('click', () => say('The online shop opens soon. Hang tight.'))
  );

  // Randomized OG-mark watermark across the whole page
  const wm = document.getElementById('wm');
  if (wm) {
    let seed = 1991;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const frag = document.createDocumentFragment();
    const n = 46;
    for (let i = 0; i < n; i++) {
      const big = rnd() < 0.18;
      const img = new Image();
      img.src = 'assets/img/jb-mark.webp';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';
      img.style.left = Math.round(rnd() * 96 - 6) + '%';
      img.style.top = (i / n * 100 + rnd() * 2).toFixed(1) + '%';
      img.style.width = Math.round(big ? 220 + rnd() * 160 : 70 + rnd() * 110) + 'px';
      img.style.opacity = (big ? 0.12 + rnd() * 0.08 : 0.16 + rnd() * 0.12).toFixed(2);
      img.style.transform = 'rotate(' + Math.round(rnd() * 70 - 35) + 'deg)';
      frag.appendChild(img);
    }
    wm.appendChild(frag);
  }

  // Travel guide teaser: say what it is, let the words fall apart, then just trip
  const tt = document.getElementById('tt');
  const ttSub = document.getElementById('tt-sub');
  const teaser = document.getElementById('trip');
  if (tt && teaser) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intro = [
      'This is the Jerome Baker Travel Guide.',
      "It's for when you're tripping.",
      'Biggest screen you have. Full screen. Lie back.',
      'It never plays the same way twice.',
      'The longer it runs, the weirder it gets.'
    ];
    const trippy = ['fumed', 'melting', 'wig-wag', 'breathe in', 'dichroic', 'the walls are fine', 'reticello', 'one of one', 'breathe out', 'the crew is here', 'opal', 'colors have sounds', 'you are the glass', 'est. 1991', 'keep going'];
    const cols = ['#FFF100', '#FFFFFF', '#FDB514', '#05B48F', '#FF7AB6', '#7FE7FF'];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const show = async (text, color) => {
      tt.textContent = '';
      tt.style.color = color || '';
      const chars = [];
      text.split(' ').forEach((word, wi) => {
        if (wi) tt.appendChild(document.createTextNode(' '));
        const w = document.createElement('span'); w.style.whiteSpace = 'nowrap'; w.style.display = 'inline-block';
        [...word].forEach((c) => { const s = document.createElement('span'); s.className = 'ch pre'; s.textContent = c; w.appendChild(s); chars.push(s); });
        tt.appendChild(w);
      });
      await wait(30);
      for (let i = 0; i < chars.length; i++) { chars[i].classList.remove('pre'); if (i % 2) await wait(18); }
      return chars;
    };
    const scatter = async (chars) => {
      chars.forEach((s) => { s.style.setProperty('--dx', rnd(-140, 140) + 'px'); s.style.setProperty('--dy', rnd(-120, 80) + 'px'); s.style.setProperty('--rr', rnd(-90, 90) + 'deg'); });
      for (let i = 0; i < chars.length; i++) { chars[i].classList.add('out'); if (i % 3 === 0) await wait(14); }
      await wait(900);
    };
    let started = false;
    const run = async () => {
      if (started) return; started = true;
      for (const line of intro) { const c = await show(line); await wait(2300); await scatter(c); }
      ttSub.style.opacity = '.0';
      teaser.classList.add('tripping');
      for (let k = 0; ; k++) {
        const c = await show(trippy[k % trippy.length], cols[k % cols.length]);
        await wait(1600 + Math.random() * 900);
        await scatter(c);
        if (k % trippy.length === trippy.length - 1) { ttSub.style.opacity = '1'; await wait(4000); ttSub.style.opacity = '0'; }
      }
    };
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { if (e.isIntersecting) run(); }, { threshold: 0.4 }).observe(teaser);
    }
  }

  // Pause animation work in anything that's off screen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('paused', !e.isIntersecting));
    }, { rootMargin: '200px' });
    document.querySelectorAll('.ticker, .hero, .redband, .wall, .strip, .wear, .made, .trip-teaser, .glass').forEach((el) => io.observe(el));
  }
})();
