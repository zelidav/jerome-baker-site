/* Power saving, every page (loaded by js/dock.js; the holo app loads it itself).
   1. Looping CSS animations (ticker, bobbing stickers, the drifting box-art collage, glitch text) pause while their
      element is off screen, and everything pauses while the tab is in the background.
   2. Phones and tablets get the lighter finish (html.lite): the big collage background stops drifting.
   3. ?perf=1 shows a small meter (frame rate, long tasks, memory, holo loop); ?perf=0 hides it. It sticks for the
      session, so it can be switched on once on a phone and left on while browsing. */
(() => {
  if (window.JBPerf) return;
  const root = document.documentElement;
  const lite = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  if (lite) root.classList.add('lite');

  const css = document.createElement('style');
  css.textContent = `
.jb-ofs,.jb-ofs *,.jb-ofs::before,.jb-ofs::after,.jb-ofs *::before,.jb-ofs *::after,
html.jb-bg *,html.jb-bg *::before,html.jb-bg *::after{animation-play-state:paused!important}
html.lite .boxbg::before{animation:none}`;
  document.head.append(css);

  // ---------- 1. pause what's off screen ----------
  const LOOPS = '.marq,.bob,.bob2,.spin,.spinr,.jig,.boxbg,.glt,.hero-piece,.hero-tag,.zg,.hdr-logo';
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('jb-ofs', !e.isIntersecting)), { rootMargin: '120px 0px' }) : null;
  const watched = new WeakSet();
  const watch = (scope) => {
    if (!io) return;
    const list = scope.matches && scope.matches(LOOPS) ? [scope] : [];
    scope.querySelectorAll && list.push(...scope.querySelectorAll(LOOPS));
    for (const el of list) if (!watched.has(el)) { watched.add(el); io.observe(el); }
  };
  const go = () => {
    watch(document.body);
    // pages build parts of themselves later (shop grid, crew wall, weird effects)
    let q = [], t = 0;
    new MutationObserver((ms) => {
      for (const m of ms) m.addedNodes.forEach((n) => n.nodeType === 1 && !n.closest('.crew-layer,.fx-layer,.holo-stage') && q.push(n));
      if (!t && q.length) t = setTimeout(() => { t = 0; const b = q; q = []; b.forEach((n) => n.isConnected && watch(n)); }, 400);
    }).observe(document.body, { childList: true, subtree: true });
  };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', go, { once: true }) : go();
  const bg = () => root.classList.toggle('jb-bg', document.hidden);
  document.addEventListener('visibilitychange', bg);

  // ---------- 3. the meter ----------
  const q = new URLSearchParams(location.search);
  try { if (q.has('perf')) sessionStorage.setItem('jb-perf', q.get('perf')); } catch (e) { /* storage blocked */ }
  let on = q.get('perf') === '1';
  try { on = sessionStorage.getItem('jb-perf') === '1'; } catch (e) { /* storage blocked */ }
  window.JBPerf = { lite };
  if (!on) return;

  const hud = document.createElement('div');
  hud.setAttribute('aria-hidden', 'true');
  hud.style.cssText = 'position:fixed;z-index:2147483647;left:6px;top:calc(6px + env(safe-area-inset-top));padding:6px 8px;background:rgba(10,10,10,.82);color:#FFF100;font:700 11px/1.35 ui-monospace,Menlo,Consolas,monospace;white-space:pre;pointer-events:none;border:2px solid #FFF100';
  const mount = () => document.body.append(hud);
  document.body ? mount() : addEventListener('DOMContentLoaded', mount, { once: true });

  // frame rate: frames in the last second, and the slowest frame as its own rate
  let frames = 0, worst = 0, last = performance.now(), fps = 0, minFps = 0;
  const frame = (t) => {
    frames++;
    worst = Math.max(worst, t - last);
    last = t;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // long tasks (Chrome, Edge, Android): count and time in the last 10 seconds
  const longs = [];
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => longs.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch (e) { /* not supported (Safari) */ }
  const holoState = () => {
    const hs = [];
    if (window.JBHoloApp && window.JBHoloApp.holo) hs.push(window.JBHoloApp.holo);
    if (window.JBHoloSpots) hs.push(...window.JBHoloSpots());
    if (!hs.length) return 'none';
    const run = hs.filter((h) => h.running).length;
    return `${run} of ${hs.length} running`;
  };
  setInterval(() => {
    fps = frames; minFps = worst ? Math.round(1000 / worst) : 0;
    frames = 0; worst = 0;
    const now = performance.now();
    while (longs.length && longs[0][0] < now - 10000) longs.shift();
    const ms = Math.round(longs.reduce((s, x) => s + x[1], 0));
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'n/a';
    hud.textContent = `FPS ${fps}  (worst ${minFps})\nlong tasks 10s ${longs.length} / ${ms} ms\nJS heap ${mem}\nDPR ${devicePixelRatio}${lite ? '  lite' : ''}\nholo ${holoState()}`;
  }, 1000);
})();
