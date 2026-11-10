/* Collage parallax, every page (leads #40, 11/6 notes): the box-art collage behind the torn strips, the sticker
   wall and the boxbg heroes moves slower than the page as you scroll, the same idea as the JB pattern on the
   glass page bands. The collage layer (.boxbg::before) already overhangs its box by 260px, so it has room to
   travel. Only collages on screen update. Off with reduced motion or Lite mode. Loaded by js/dock.js. */
(() => {
  if (window.JBParallax) return;
  window.JBParallax = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (localStorage.getItem('jb-lite') === '1') return; } catch (_) {}
  const css = document.createElement('style');
  css.textContent = '.boxbg::before{translate:0 var(--py,0px)}';
  document.head.append(css);
  const live = new Set();
  let q = false;
  const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target))); if (!q) { q = true; requestAnimationFrame(tick); } }, { rootMargin: '200px 0px' });
  const watch = () => document.querySelectorAll('.boxbg:not(.still)').forEach((b) => { if (!b.dataset.px) { b.dataset.px = '1'; io.observe(b); } });
  watch();
  new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
  function tick() {
    q = false;
    const vh = innerHeight;
    live.forEach((b) => {
      const r = b.getBoundingClientRect();
      // the background lags behind the content: about 35% of the scroll, kept inside the 260px overhang
      const py = Math.max(-230, Math.min(230, (r.top + r.height / 2 - vh / 2) * -0.35));
      b.style.setProperty('--py', py.toFixed(1) + 'px');
    });
  }
  addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(tick); } }, { passive: true });
  addEventListener('resize', tick);
  tick();
})();
