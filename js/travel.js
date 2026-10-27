(() => {
  const root = document.documentElement;
  const body = document.body;
  const intro = document.getElementById('intro');
  const fsBtn = document.getElementById('fs');
  const calmBtn = document.getElementById('calm');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Full screen ----------
  const canFS = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const isFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const enterFS = () => {
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) { try { const p = req.call(root, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  };
  const exitFS = () => {
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex) { try { const p = ex.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  };
  const toggleFS = () => (isFS() ? exitFS() : enterFS());
  const syncFS = () => { fsBtn.textContent = isFS() ? 'Exit full screen' : 'Full screen'; };
  document.addEventListener('fullscreenchange', syncFS);
  document.addEventListener('webkitfullscreenchange', syncFS);
  fsBtn.addEventListener('click', toggleFS);
  if (!canFS) {
    // iPhone Safari: no page full screen. Point people at Add to Home Screen instead.
    fsBtn.hidden = true;
    document.getElementById('go-fs').textContent = 'Start the trip';
    document.getElementById('intro-copy').textContent = 'For true full screen on iPhone: tap Share, then Add to Home Screen, and open it from there.';
  }

  // ---------- Intro ----------
  const standalone = window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
  const skip = new URLSearchParams(location.search).has('go') || standalone;
  const closeIntro = () => { intro.classList.add('gone'); intro.setAttribute('aria-hidden', 'true'); setTimeout(() => { intro.hidden = true; }, 500); };
  if (skip) { intro.hidden = true; } else { document.getElementById('go-fs').focus({ preventScroll: true }); }
  document.getElementById('go-fs').addEventListener('click', () => { enterFS(); closeIntro(); });
  document.getElementById('go-window').addEventListener('click', closeIntro);

  // ---------- Keys ----------
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); if (!intro.hidden) closeIntro(); toggleFS(); }
    if ((e.key === 'Escape') && !intro.hidden) closeIntro();
    if (e.key === ' ' && intro.hidden && window.scrollY < 50) { e.preventDefault(); setCalm(!body.classList.contains('calm')); }
  });

  // ---------- Pause / calm ----------
  const setCalm = (on) => {
    body.classList.toggle('calm', on);
    calmBtn.textContent = on ? 'Play' : 'Pause';
    calmBtn.setAttribute('aria-pressed', String(on));
  };
  calmBtn.addEventListener('click', () => setCalm(!body.classList.contains('calm')));
  if (reduce) setCalm(true);

  // ---------- Hide controls + cursor when idle ----------
  let idleT;
  const wake = () => {
    body.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (intro.hidden && window.scrollY < 50) body.classList.add('idle'); }, 2800);
  };
  ['mousemove', 'touchstart', 'keydown', 'scroll'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
  wake();

  // ---------- Evolving words + palettes ----------
  const words = ['fumed', 'wig-wag', 'dichroic', 'reticello', 'millie', 'knuckles', 'opal', 'ribbon cane', 'one of one', 'est. 1991', 'the OG mark', 'the JB Crew'];
  const pals = [['#EE342E', '#FFFFFF'], ['#FDB514', '#0A0A0A'], ['#05B48F', '#0A0A0A'], ['#2A3B8E', '#FFF100']];
  const passing = document.getElementById('passing');
  const nomap = document.getElementById('nomap');
  let phase = 0;
  const tick = () => {
    if (body.classList.contains('calm') || document.hidden || tripHidden) return;
    phase++;
    const p = pals[phase % pals.length];
    passing.textContent = 'Now passing: ' + words[phase % words.length];
    passing.style.backgroundColor = p[0];
    passing.style.color = p[1];
    if (nomap) nomap.style.color = pals[(phase + 1) % pals.length][0];
  };
  setInterval(tick, 3200);

  let tripHidden = false;
  // ---------- Kaleidoscope (one canvas, 12 mirrored wedges) ----------
  const cv = document.getElementById('kal');
  const ctx = cv.getContext('2d', { alpha: false });
  const wedge = document.createElement('canvas');
  const wx = wedge.getContext('2d');
  const load = (src) => new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  let imgs = null, pats = null;
  let W = 0, H = 0, R = 0, cx = 0, cy = 0, tx = 0, ty = 0;
  let SEG = 12, ANG = Math.PI * 2 / SEG, SPD = 1, ZOOM = 1;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cap = 1200 / Math.max(innerWidth, innerHeight);       // keep the canvas light on big screens
    const k = Math.min(dpr, Math.max(cap, 0.6));
    W = cv.width = Math.round(cv.clientWidth * k);
    H = cv.height = Math.round(cv.clientHeight * k);
    R = Math.ceil(Math.hypot(W, H) / 2) + 4;
    wedge.width = R; wedge.height = Math.ceil(R * Math.sin(ANG)) + 2;
    if (imgs) pats = makePats();
  };
  const makePats = () => ({
    a: imgs[0] && wx.createPattern(imgs[0], 'repeat'),
    b: imgs[1] && wx.createPattern(imgs[1], 'repeat'),
    c: imgs[2] && wx.createPattern(imgs[2], 'repeat')
  });
  const fillPat = (pat, x, y, s) => {
    if (!pat) return;
    wx.save(); wx.translate(-x, -y); wx.scale(s, s); wx.fillStyle = pat; wx.fillRect(x / s, y / s, (R + 40) / s, (wedge.height + 40) / s); wx.restore();
  };
  const draw = (t) => {
    const s = t / 1000;
    // build one wedge
    wx.globalCompositeOperation = 'source-over'; wx.globalAlpha = 1;
    wx.clearRect(0, 0, wedge.width, wedge.height);
    wx.save();
    wx.beginPath(); wx.moveTo(0, 0); wx.lineTo(R, 0); wx.lineTo(R * Math.cos(ANG), R * Math.sin(ANG)); wx.closePath(); wx.clip();
    const sc = Math.max(W, H) / 1100;
    fillPat(pats.a, s * 38 % 4000, s * 23 % 4000, 0.9 * sc + 0.15 * Math.sin(s * 0.3));
    wx.globalCompositeOperation = 'screen'; wx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(s * 0.55));
    fillPat(pats.b, -s * 30 % 4000, s * 41 % 4000, 0.8 * sc);
    wx.globalCompositeOperation = 'overlay'; wx.globalAlpha = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(s * 0.4 + 2));
    fillPat(pats.c, s * 17 % 6000, -s * 12 % 6000, 0.55 * sc);
    wx.globalCompositeOperation = 'color'; wx.globalAlpha = 0.28;
    wx.fillStyle = 'hsl(' + ((s * 22 * SPD) % 360) + ',95%,55%)'; wx.fillRect(0, 0, R, wedge.height);
    wx.restore();
    // stamp it 12 times, every other one mirrored
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H);
    const k = W / cv.clientWidth;
    ctx.translate(W / 2 + tx * k, H / 2 + ty * k);
    ctx.rotate(s * 0.09 * SPD);
    const z = (1.08 + 0.06 * Math.sin(s * 0.5)) * ZOOM; ctx.scale(z, z);
    for (let i = 0; i < SEG; i++) {
      ctx.save();
      if (i % 2) { ctx.rotate((i + 1) * ANG); ctx.scale(1, -1); } else { ctx.rotate(i * ANG); }
      ctx.drawImage(wedge, 0, 0);
      ctx.restore();
    }
  };
  let running = false, rid = 0, last = 0;
  const loop = (t) => {
    rid = 0;
    if (!running) return;
    if (t - last > 30) { last = t; draw(t); }               // ~30fps is plenty for a slow trip and halves the work
    rid = requestAnimationFrame(loop);
  };
  const start = () => { if (!imgs || running) return; running = true; if (!rid) rid = requestAnimationFrame(loop); };
  const stop = () => { running = false; };
  const shouldRun = () => !body.classList.contains('calm') && !document.hidden && !tripHidden;
  const refresh = () => (shouldRun() ? start() : stop());
  resize();
  window.addEventListener('resize', () => { resize(); if (imgs) draw(performance.now()); }, { passive: true });
  Promise.all([load('../assets/img/kaleido-a.webp'), load('../assets/img/kaleido-b.webp'), load('../assets/img/box.webp')]).then((r) => {
    imgs = r; pats = makePats(); draw(performance.now()); refresh();
  });
  document.addEventListener('visibilitychange', refresh);
  new MutationObserver(refresh).observe(body, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('pointermove', (e) => {
    if (body.classList.contains('calm')) return;
    tx = Math.round((e.clientX / innerWidth - 0.5) * 120);
    ty = Math.round((e.clientY / innerHeight - 0.5) * 60);
  }, { passive: true });

  // let the evolution script turn the knobs
  window.JBTrip = {
    set(o) {
      if (o.seg && o.seg !== SEG) { SEG = o.seg; ANG = Math.PI * 2 / SEG; resize(); }
      if (o.spd) SPD = o.spd;
      if (o.zoom) ZOOM = o.zoom;
    },
    get: () => ({ seg: SEG, spd: SPD, zoom: ZOOM })
  };

  // ---------- Stop the GPU work when the trip is scrolled away ----------
  const trip = document.getElementById('trip');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { tripHidden = !e.isIntersecting; trip.classList.toggle('paused', tripHidden); refresh(); }, { threshold: 0.02 }).observe(trip);
  }
})();
