/* HOLO_SAMPLE: the holo cloth (js/holo/holo.js, src/holo) on a few spots of the real site.
   On by default; ?holo=0 / ?holo=1 turns it off or on for the session (the kill switch, if a phone misbehaves).
   The three.js bundle only loads when a spot gets near the screen, the render loop pauses when it scrolls away,
   phones get the Low profile, and with no WebGL2 or with reduced motion the page stays exactly as it was. */
(() => {
  const q = new URLSearchParams(location.search);
  try { if (q.has('holo')) sessionStorage.setItem('jb-holo', q.get('holo')); } catch (e) { /* storage blocked */ }
  let flag = null;
  try { flag = sessionStorage.getItem('jb-holo'); } catch (e) { /* storage blocked */ }
  const HOLO_SAMPLE = flag != null ? flag !== '0' : true;
  // the original art stays for reduced motion, data saver and weak devices
  const weak = (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  if (!HOLO_SAMPLE || weak || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const base = document.documentElement.dataset.base || '';
  const phone = innerWidth < 768;
  const css = document.createElement('style');
  css.textContent = `
.holo-stage{position:absolute;inset:0;z-index:9;opacity:0;transition:opacity .5s ease}
.holo-stage.on{opacity:1}
.holo-stage canvas{display:block;width:100%!important;height:100%!important;cursor:grab}
.holo-stage canvas:active{cursor:grabbing}
.holo-hint{position:absolute;z-index:10;left:50%;bottom:8px;translate:-50% 0;margin:0;padding:6px 12px;background:#0A0A0A;color:#FCD804;font:800 13px/1.2 Montserrat,Helvetica,Arial,sans-serif;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .4s}
.holo-stage.on + .holo-hint{opacity:1}
.collage.holo-live > :not(.holo-stage):not(.holo-hint){visibility:hidden}
.holo-sec{background:#233671;color:#fff;padding-top:64px;padding-bottom:64px;border-top:4px solid #DA2342}
.holo-box{position:relative;flex:0 1 480px;width:min(480px,100%);aspect-ratio:1;max-width:100%}
.holo-box .holo-hint{bottom:0}
.holo-sec h2{color:#FFF100}`;
  document.head.appendChild(css);

  // the spots: where it goes, and what it shows
  const spots = [];
  const collage = document.querySelector('.hero .collage');
  if (collage) spots.push({
    host: collage, hint: phone ? 'Swipe the box sideways. Double-tap to crumple it.' : 'Grab the box. Double-tap to crumple it.',
    opts: { preset: 'jb-poster', clothImage: base + 'assets/img/box.webp' },
  });
  // on a crew page the sticker gets its own section, right after the GIF one (the hero stays the art, so it can still turn real)
  const crewImg = document.querySelector('.cp-hero .art img');
  const gif = document.querySelector('section.gif');
  if (crewImg && gif) {
    const name = [...document.querySelectorAll('.cp-name span')].map((x) => x.textContent).join(' ') || 'The sticker';
    const sec = document.createElement('section');
    sec.className = 'holo-sec pad';
    sec.innerHTML = '<div class="wrap gif-in"><div class="holo-box"></div><div><h2 class="display"></h2><p>The sticker, in holographic foil. Grab it and twist it, or double-tap to crumple it into a ball. Leave it alone and it flattens back out.</p></div></div>';
    sec.querySelector('h2').textContent = name.trim() + ', in holo.';
    gif.after(sec);
    spots.push({
      host: sec.querySelector('.holo-box'), hint: phone ? 'Swipe it sideways. Double-tap to crumple.' : 'Twist it. Double-tap to crumple.',
      opts: { preset: 'jb-sticker', clothImage: crewImg.currentSrc || crewImg.src, dieCut: true },
    });
  }
  if (!spots.length) return;

  let lib = null;
  const loadLib = () => lib || (lib = import(new URL(base + 'js/holo/holo.js', location.href).href).then(() => window.JBHolo));

  const start = async (spot) => {
    spot.holo = true;
    // no WebGL2, no holo: the art stays (checked here, not on load, because it costs a GPU context)
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) { spot.holo = 'off'; return; }
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    let mountHoloCloth;
    try { ({ mountHoloCloth } = await loadLib()); } catch (e) { return; } // the bundle didn't load: the art stays
    const stage = document.createElement('div');
    stage.className = 'holo-stage';
    const hint = document.createElement('p');
    hint.className = 'holo-hint';
    hint.textContent = spot.hint;
    spot.host.append(stage, hint);
    // if it isn't drawing within 8s, drop it and keep the art
    const bail = setTimeout(() => { try { spot.holo.dispose(); } catch (e) { /* never mounted */ } stage.remove(); hint.remove(); spot.holo = 'off'; }, 8000);
    try {
      spot.holo = mountHoloCloth(stage, {
        ...spot.opts, transparentBg: true, pokeOnEnter: true, crumpleOnDoubleTap: true, snapBack: 3500,
        performance: phone ? 'Low' : 'High',
        touchAction: phone ? 'pan-y' : undefined,
        onReady: () => {
          clearTimeout(bail);
          spot.host.classList.add('holo-live');
          stage.classList.add('on');
          setTimeout(() => (hint.style.opacity = '0'), 5000);
        },
      });
    } catch (e) { clearTimeout(bail); stage.remove(); hint.remove(); spot.holo = 'off'; } // no GPU for it: the art stays
  };

  // nothing loads until the visitor does something (move, touch, scroll, key), so it never slows the first paint
  const engaged = new Promise((go) => ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown', 'wheel']
    .forEach((ev) => addEventListener(ev, go, { once: true, passive: true })));
  // load when it's near the screen; pause the loop when it isn't
  const near = new IntersectionObserver((entries) => entries.forEach((e) => {
    const spot = spots.find((s) => s.host === e.target);
    if (!spot) return;
    spot.seen = e.isIntersecting;
    if (e.isIntersecting && !spot.holo) engaged.then(() => { if (spot.seen && !spot.holo) start(spot); });
    else if (spot.holo && spot.holo.pause) e.isIntersecting ? spot.holo.resume() : spot.holo.pause();
  }), { rootMargin: '300px 0px' });
  spots.forEach((s) => near.observe(s.host));
})();
