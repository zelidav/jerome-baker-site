/* HOLO_SAMPLE: the holo cloth (js/holo/holo.js, src/holo) on a few spots of the real site, as a test.
   Off on the live site by default; on at localhost. ?holo=1 / ?holo=0 turns it on or off for the session.
   The three.js bundle only loads when a spot gets near the screen, the render loop pauses when it scrolls away,
   phones get the Low profile, and with no WebGL2 or with reduced motion the page stays exactly as it was. */
(() => {
  const q = new URLSearchParams(location.search);
  try { if (q.has('holo')) sessionStorage.setItem('jb-holo', q.get('holo')); } catch (e) { /* storage blocked */ }
  let flag = null;
  try { flag = sessionStorage.getItem('jb-holo'); } catch (e) { /* storage blocked */ }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const HOLO_SAMPLE = flag != null ? flag !== '0' : local;
  if (!HOLO_SAMPLE || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return;
  probe.getExtension('WEBGL_lose_context')?.loseContext();

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
.cp-hero .art.holo-live{min-height:min(620px,92vw)}
.cp-hero .art.holo-live > img{visibility:hidden}`;
  document.head.appendChild(css);

  // the spots: where it goes, and what it shows
  const spots = [];
  const collage = document.querySelector('.hero .collage');
  if (collage) spots.push({
    host: collage, hint: 'Grab the box. Double-tap to crumple it.',
    opts: { preset: 'jb-poster', clothImage: base + 'assets/img/box.webp' },
  });
  const crewArt = document.querySelector('.cp-hero .art');
  const crewImg = crewArt && crewArt.querySelector('img');
  if (crewImg) spots.push({
    host: crewArt, hint: 'Twist it. Double-tap to crumple.',
    opts: { preset: 'jb-sticker', clothImage: crewImg.currentSrc || crewImg.src, dieCut: true },
  });
  if (!spots.length) return;

  let lib = null;
  const loadLib = () => lib || (lib = import(new URL(base + 'js/holo/holo.js', location.href).href).then(() => window.JBHolo));

  const start = async (spot) => {
    const { mountHoloCloth } = await loadLib();
    const stage = document.createElement('div');
    stage.className = 'holo-stage';
    const hint = document.createElement('p');
    hint.className = 'holo-hint';
    hint.textContent = spot.hint;
    spot.host.append(stage, hint);
    spot.holo = mountHoloCloth(stage, {
      ...spot.opts, transparentBg: true, pokeOnEnter: true, crumpleOnDoubleTap: true, snapBack: 3500,
      performance: phone ? 'Low' : 'High',
      onReady: () => {
        spot.host.classList.add('holo-live');
        stage.classList.add('on');
        setTimeout(() => (hint.style.opacity = '0'), 5000);
      },
    });
  };

  // load when it's near the screen; pause the loop when it isn't
  const near = new IntersectionObserver((entries) => entries.forEach((e) => {
    const spot = spots.find((s) => s.host === e.target);
    if (!spot) return;
    if (e.isIntersecting && !spot.holo) start(spot);
    else if (spot.holo) e.isIntersecting ? spot.holo.resume() : spot.holo.pause();
  }), { rootMargin: '300px 0px' });
  spots.forEach((s) => near.observe(s.host));
})();
