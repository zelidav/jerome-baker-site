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
.holo-sec h2{color:#FFF100}
.pd-big.holo-live > img:not(.holo-thief){visibility:hidden}
.pd-big:has(.holo-thief,.holo-line){overflow:hidden}
.holo-line{position:absolute;z-index:8;left:-4%;right:-4%;height:3px;background:#5a4632;border-radius:2px;box-shadow:0 2px 3px rgba(0,0,0,.25);pointer-events:none}
.holo-pin{position:absolute;z-index:10;width:9px;height:24px;translate:-50% -35%;background:#c79a5b;border:2px solid #0A0A0A;border-radius:2px;pointer-events:none}
.holo-thief{position:absolute;z-index:11;height:34%;width:auto;pointer-events:none;translate:-50% -30%;filter:drop-shadow(3px 4px 0 rgba(0,0,0,.35))}
.holo-poof{position:absolute;z-index:12;width:60%;aspect-ratio:1;translate:-50% -50%;pointer-events:none;
  background:radial-gradient(circle at 35% 40%,#fff 0 18%,transparent 19%),radial-gradient(circle at 62% 35%,#eee 0 20%,transparent 21%),radial-gradient(circle at 50% 62%,#f4f4f4 0 24%,transparent 25%),radial-gradient(circle at 28% 64%,#ddd 0 15%,transparent 16%),radial-gradient(circle at 72% 62%,#e8e8e8 0 16%,transparent 17%)}
.holo-poof b{position:absolute;left:50%;top:50%;translate:-50% -50%;rotate:-8deg;font:900 clamp(28px,6vw,52px)/1 Montserrat,Helvetica,Arial,sans-serif;color:#FFF100;-webkit-text-stroke:2px #0A0A0A;paint-order:stroke;text-shadow:3px 3px 0 #DA2342}
.holo-took{position:absolute;z-index:12;left:50%;top:12px;translate:-50% 0;margin:0;padding:8px 14px;background:#DA2342;color:#fff;font:800 14px/1.2 Montserrat,Helvetica,Arial,sans-serif;white-space:nowrap;rotate:-2deg;box-shadow:3px 3px 0 #0A0A0A}`;
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
  // the Crossed Bongs polos hang on a clothesline in the breeze, until the crew member who wears that color
  // runs in, grabs it and vanishes with it. The cutouts are assets/holo/polo-<id>.webp (made from the shop photo).
  const THIEF = { 672: 'bear', 696: 'devil', 720: 'grin' };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tween = (ms, f) => new Promise((done) => {
    const t0 = performance.now();
    const go = (now) => { const k = Math.min(1, (now - t0) / ms); f(k); k < 1 ? requestAnimationFrame(go) : done(); };
    requestAnimationFrame(go);
  });
  const snatch = async (spot) => {
    const h = spot.holo, host = spot.host, alive = () => spot.holo === h && host.isConnected;
    const at = (u, v) => { const r = host.getBoundingClientRect(), p = h.screenAt(u, v); return { x: p.x - r.left, y: p.y - r.top }; };
    // the clothesline, and a pin on each shoulder
    const L = at(.27, .1), R = at(.73, .1);
    const line = document.createElement('i');
    line.className = 'holo-line';
    line.style.top = (L.y - 2) + 'px';
    const pins = [L, R].map((p) => { const i = document.createElement('i'); i.className = 'holo-pin'; i.style.left = p.x + 'px'; i.style.top = p.y + 'px'; return i; });
    spot.stage.before(line);
    host.append(...pins);
    spot.extras = [line, ...pins];
    // let it blow around a while, and wait out anyone holding it
    let touched = 0;
    spot.stage.addEventListener('pointerdown', () => (touched = performance.now()));
    await wait(phone ? 4000 : 5500);
    while (alive() && performance.now() - touched < 2500) await wait(500);
    if (!alive()) return;
    const key = THIEF[spot.id];
    const who = Object.values((window.JBShop && window.JBShop.crew) || {}).find((c) => c.img === key);
    const thief = new Image();
    thief.src = base + 'assets/crew/' + key + '_m.webp';
    thief.alt = '';
    thief.className = 'holo-thief';
    await thief.decode().catch(() => {});
    if (!alive()) return;
    host.append(thief);
    spot.extras.push(thief);
    const W = host.clientWidth;
    // runs in from the right to the right shoulder
    const from = { x: W * 1.25, y: R.y + host.clientHeight * .12 };
    await tween(850, (k) => {
      const to = at(.7, .16), e = 1 - (1 - k) ** 3;
      thief.style.left = from.x + (to.x - from.x) * e + 'px';
      thief.style.top = from.y + (to.y - from.y) * e - Math.abs(Math.sin(k * Math.PI * 3)) * 18 + 'px';
    });
    if (!alive()) return;
    // grabs it, the pins pop, and yanks it back the way they came
    h.grabAt(.7, .16);
    h.release();
    h.wind(2);
    pins.forEach((p) => p.animate([{ translate: '-50% -35%', opacity: 1 }, { translate: '-50% 120%', rotate: '160deg', opacity: 0 }], { duration: 600, easing: 'ease-in', fill: 'forwards' }));
    const r0 = host.getBoundingClientRect(), x0 = parseFloat(thief.style.left), y0 = parseFloat(thief.style.top);
    await tween(1100, (k) => {
      const x = x0 + W * .32 * k * k, y = y0 - 20 * Math.sin(k * Math.PI);
      thief.style.left = x + 'px';
      thief.style.top = y + 'px';
      thief.style.rotate = (k * 10) + 'deg';
      h.pullTo(r0.left + x, r0.top + y);
    });
    if (!alive()) return;
    // POOF: both gone
    const poof = document.createElement('i');
    poof.className = 'holo-poof';
    poof.innerHTML = '<b>POOF!</b>';
    poof.style.left = thief.style.left;
    poof.style.top = (parseFloat(thief.style.top) + thief.offsetHeight * .2) + 'px';
    host.append(poof);
    spot.extras.push(poof);
    h.letGo();
    h.crumple();
    poof.animate([{ scale: .2, opacity: 0 }, { scale: 1.1, opacity: 1, offset: .25 }, { scale: 1.3, opacity: 0 }], { duration: 1100, easing: 'ease-out', fill: 'forwards' });
    thief.animate([{ scale: 1, opacity: 1 }, { scale: 0, opacity: 0 }], { duration: 220, fill: 'forwards' });
    spot.stage.animate([{ scale: 1, opacity: 1 }, { scale: .1, opacity: 0 }], { duration: 260, fill: 'forwards' });
    await wait(500);
    if (!alive()) return;
    // the photo comes back with a note, then a fresh one goes up on the line
    stop(spot, true);
    const took = document.createElement('p');
    took.className = 'holo-took';
    took.textContent = (who ? who.name : 'Somebody') + ' took it. Hang on.';
    host.append(took);
    spot.extras = [took];
    await wait(3200);
    if (spot.holo !== null || spot.closed || !host.isConnected) return;
    took.remove();
    start(spot);
  };
  // in the merch detail view: the Classic Tee is heavy woven cloth you can grab, the polos hang in the breeze.
  // Mounted when it opens, dropped when it closes.
  const views = [
    { dlg: '#pd', name: '#pdTitle', test: /^Classic Tee/i, host: '.pd-big', img: '#pdImg',
      hint: phone ? 'Swipe the tee sideways.' : 'Grab the tee.', opts: { preset: 'jb-poster' } },
    { dlg: '#pd', name: '#pdTitle', test: /^Polo/i, host: '.pd-big', img: '#pdImg',
      // only the front photo has a cutout
      src: (src) => { const m = src.match(/shop\/(\d+)_0\.webp/); return m && THIEF[m[1]] ? { id: m[1], src: base + 'assets/holo/polo-' + m[1] + '.webp' } : null; },
      hint: phone ? 'Swipe the polo sideways.' : 'Grab the polo.', scene: snatch,
      opts: { preset: 'jb-fabric', dieCut: true, pokeOnEnter: false, crumpleOnDoubleTap: false, snapBack: false,
        hang: { pins: [[.27, .1], [.73, .1]], wind: 3.5, gravity: 9 } } },
  ].filter((v) => document.querySelector(v.dlg));
  if (!spots.length && !views.length) return;

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
    spot.host.append(stage);
    if (spot.hint) spot.host.append(hint);
    spot.stage = stage; spot.hintEl = hint;
    // if it isn't drawing within 8s, drop it and keep the art
    const bail = setTimeout(() => { try { spot.holo.dispose(); } catch (e) { /* never mounted */ } stage.remove(); hint.remove(); spot.holo = 'off'; }, 8000);
    try {
      spot.holo = mountHoloCloth(stage, {
        transparentBg: true, pokeOnEnter: true, crumpleOnDoubleTap: true, snapBack: 3500,
        performance: phone ? 'Low' : 'High',
        touchAction: phone ? 'pan-y' : undefined,
        ...spot.opts,
        onReady: () => {
          clearTimeout(bail);
          spot.host.classList.add('holo-live');
          stage.classList.add('on');
          setTimeout(() => (hint.style.opacity = '0'), 5000);
          if (spot.scene) spot.scene(spot);
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

  function stop(spot, keep) {
    if (spot.holo && spot.holo.dispose) spot.holo.dispose();
    spot.holo = null;
    if (spot.stage) spot.stage.remove();
    if (spot.hintEl) spot.hintEl.remove();
    (spot.extras || []).forEach((el) => el.remove());
    spot.extras = [];
    if (!keep) spot.closed = true;
    spot.host.classList.remove('holo-live');
  }
  views.forEach((v) => {
    const dlg = document.querySelector(v.dlg);
    let cur = null, t = 0;
    const sync = () => {
      const host = document.querySelector(v.host), img = document.querySelector(v.img), name = document.querySelector(v.name);
      const pick = dlg.open && host && img && name && v.test.test(name.textContent.trim()) ? (v.src ? v.src(img.src) : { src: img.src }) : null;
      const want = pick && pick.src;
      if (cur && (cur.key !== want || cur.host !== host || !host.isConnected)) { stop(cur); cur = null; }
      if (!want || cur) return;
      cur = { key: want, id: pick.id, host, hint: v.hint, scene: v.scene, opts: { ...v.opts, clothImage: want } };
      engaged.then(() => { if (cur && cur.key === want) start(cur); });
    };
    new MutationObserver(() => { if (!t) t = setTimeout(() => { t = 0; sync(); }, 150); })
      .observe(dlg, { attributes: true, attributeFilter: ['open'], childList: true, subtree: true, characterData: true });
    // a #p= link can open it before this runs
    sync();
  });
})();
