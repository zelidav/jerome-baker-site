/* The Baker dance: a 6 s loop of her waltzing with Baker, the purple giant, cut out so it floats over the page.
   She waltzes across the screen when Baker is opened on the bench, and once per visit when the Baker tile on the
   Giant shelf scrolls into view. Nothing downloads until then (preload none, the src is only set at that moment).
   Chrome, Firefox and Android get a VP9 WebM with alpha (~0.6 MB); Safari gets an animated WebP. Off for reduced
   motion, data saver and weak devices. She never blocks a tap; tapping her also sends her off. ?dance=0 turns it off for the session. */
(() => {
  const BAKER = 'JBD-595E91DF67DE';
  const q = new URLSearchParams(location.search);
  try { if (q.has('dance')) sessionStorage.setItem('jb-dance', q.get('dance')); } catch (e) { /* storage blocked */ }
  let off = false;
  try { off = sessionStorage.getItem('jb-dance') === '0'; } catch (e) { /* storage blocked */ }
  const ua = navigator.userAgent;
  // every browser on an iPhone or iPad is WebKit underneath (Chrome there is CriOS): none of them play WebM with alpha,
  // and iOS reports a low core count for privacy, so it must not count as a weak device
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const weak = (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 3) || (!ios && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  if (off || weak || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dir = (document.documentElement.dataset.base || '../') + 'assets/dance/';
  // the WebM's alpha channel is dropped by some browsers and GPUs (she waltzes in a black box), so everyone gets the
  // animated WebP, which keeps its transparency everywhere
  const safari = true;
  const css = document.createElement('style');
  css.textContent = `
.jb-dance{position:fixed;z-index:60;bottom:2vh;left:0;height:min(62vh,520px);aspect-ratio:466/600;pointer-events:none;opacity:0;
  filter:drop-shadow(0 14px 18px rgba(10,10,10,.35));-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
.jb-dance.go{animation:jb-dance-across var(--t,12s) linear forwards}
.jb-dance video,.jb-dance img{width:100%;height:100%;display:block;object-fit:contain;pointer-events:none}
@keyframes jb-dance-across{0%{opacity:0;translate:-40vw 0}6%{opacity:1}92%{opacity:1}100%{opacity:0;translate:100vw 0}}
.bench .jb-dance{position:fixed;z-index:50}
@media (max-width:700px){.jb-dance{height:min(46vh,380px)}}`;
  document.head.append(css);

  let live = null;
  const dance = (host) => {
    // already waltzing on the page: the bench is a modal on top of everything, so move her into it
    if (live) { if (live.parentNode !== host) host.append(live); return; }
    const el = document.createElement('div');
    el.className = 'jb-dance';
    el.setAttribute('aria-hidden', 'true');
    let media;
    if (safari) {
      media = new Image();
      media.alt = '';
      media.src = dir + 'baker-dance.webp';
    } else {
      media = document.createElement('video');
      Object.assign(media, { muted: true, loop: true, autoplay: true, playsInline: true, preload: 'none', poster: dir + 'baker-dance-poster.webp' });
      media.setAttribute('muted', '');
      media.setAttribute('playsinline', '');
      media.src = dir + 'baker-dance.webm';
    }
    el.append(media);
    // a slow waltz across: phones cross faster since there is less screen
    el.style.setProperty('--t', (innerWidth < 700 ? 10 : 14) + 's');
    const bye = () => { if (live === el) live = null; el.remove(); document.removeEventListener('pointerdown', hide, true); };
    el.addEventListener('animationend', bye);
    // she never blocks a tap (the Buy button can be right behind her): a tap that lands on her still goes through,
    // and also sends her off
    const hide = (e) => {
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      document.removeEventListener('pointerdown', hide, true);
      el.style.transition = 'opacity .3s'; el.style.opacity = '0'; el.style.animationPlayState = 'paused'; setTimeout(bye, 320);
    };
    document.addEventListener('pointerdown', hide, true);
    host.append(el);
    live = el;
    const start = () => el.classList.add('go');
    if (safari) (media.decode ? media.decode().then(start, start) : start());
    else { media.addEventListener('playing', start, { once: true }); media.play().catch(start); }
  };

  // Baker on the bench (the bench is a modal dialog, so she has to live inside it to show on top)
  const bench = document.getElementById('bench');
  if (bench) {
    new MutationObserver(() => {
      if (bench.open && location.hash === '#p=' + BAKER) dance(bench);
      else if (!bench.open && live && live.parentNode === bench) { live.remove(); live = null; }
    }).observe(bench, { attributes: true, attributeFilter: ['open'] });
    // switching pieces inside the bench changes the h@sh with replaceState, which fires no event: check on clicks
    bench.addEventListener('click', () => setTimeout(() => { if (bench.open && location.hash === '#p=' + BAKER) dance(bench); }, 60));
    // a link straight to Baker opens the bench before this script runs, so check now and whenever the fragment changes
    const check = () => { if (bench.open && location.hash === '#p=' + BAKER) dance(bench); };
    check();
    addEventListener('hashchange', () => setTimeout(check, 60));
    addEventListener('load', () => setTimeout(check, 300));
  }

  // once per visit, when the Baker tile on the Giant shelf comes into view
  let seen = false;
  try { seen = sessionStorage.getItem('jb-dance-seen') === '1'; } catch (e) { /* storage blocked */ }
  const watch = () => {
    const tile = document.querySelector(`.tile[data-id="${BAKER}"]`);
    if (!tile || seen) return !!tile;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting && e.intersectionRatio > 0.4)) return;
      io.disconnect();
      seen = true;
      try { sessionStorage.setItem('jb-dance-seen', '1'); } catch (e) { /* storage blocked */ }
      if (!(bench && bench.open)) dance(document.body);
    }, { threshold: [0.4] });
    io.observe(tile);
    return true;
  };
  // the shelves are drawn by glass.js after load
  if (!watch()) addEventListener('load', () => { if (!watch()) setTimeout(watch, 1500); });
})();
