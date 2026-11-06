/* HOLO_SAMPLE: the holo cloth (js/holo/holo.js, src/holo) on a few spots of the real site.
   On by default; ?holo=0 / ?holo=1 turns it off or on for the session (the kill switch, if a phone misbehaves).
   The three.js bundle only loads when a spot gets near the screen, the render loop pauses when it scrolls away,
   phones get the Low profile, and with no WebGL2 or with reduced motion the page stays exactly as it was. */
(() => {
  const q = new URLSearchParams(location.search);
  try { if (q.has('holo')) sessionStorage.setItem('jb-holo', q.get('holo')); } catch (e) { /* storage blocked */ }
  let flag = null;
  try { flag = sessionStorage.getItem('jb-holo'); } catch (e) { /* storage blocked */ }
  // Lite mode (js/litemode.js) keeps the original art: no WebGL at all
  let saver = false;
  try { saver = localStorage.getItem('jb-lite') === '1'; } catch (e) { /* storage blocked */ }
  const HOLO_SAMPLE = !saver && (flag != null ? flag !== '0' : true);
  // one show at a time (same lock as js/crew.js and js/antics.js)
  const stageBusy = () => document.documentElement.dataset.dancing === '1' || !!(window.JBStage && window.JBStage.busy());
  const stageClaim = (n) => !window.JBStage || window.JBStage.claim(n);
  const stageRelease = (n) => { if (window.JBStage) window.JBStage.release(n); };
  // the original art stays for reduced motion, data saver and weak devices
  const weak = (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  if (!HOLO_SAMPLE || weak || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const base = document.documentElement.dataset.base || '';
  const phone = innerWidth < 768;
  const css = document.createElement('style');
  css.textContent = `
.holo-stage{position:absolute;inset:0;z-index:9;opacity:0;transition:opacity .5s ease}
.holo-stage.on{opacity:1}
.holo-stage,.holo-stage canvas{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
.holo-stage canvas{display:block;width:100%!important;height:100%!important;cursor:grab}
.holo-stage canvas:active{cursor:grabbing}
.holo-hint{position:absolute;z-index:10;left:50%;bottom:8px;translate:-50% 0;margin:0;padding:6px 12px;background:#0A0A0A;color:#FCD804;font:800 13px/1.2 Montserrat,Helvetica,Arial,sans-serif;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .4s}
.holo-stage.on + .holo-hint{opacity:1}
@media (max-width:700px){.holo-hint{white-space:normal;width:max-content;max-width:calc(100% - 80px);text-align:center;left:8px;translate:none}}
.collage.holo-live > :not(.holo-stage):not(.holo-hint):not(.holo-play):not(.holo-finger){visibility:hidden}
/* floating: the stage covers the whole section; only the cloth itself takes the pointer, so text and links under it still work */
.holo-float{position:relative}
.holo-stage.float{pointer-events:none;z-index:9}
.holo-stage.float.hit{pointer-events:auto}
.holo-fs .holo-stage{pointer-events:auto!important}
.holo-anchor{position:relative}
.holo-sec{background:#233671;color:#fff;padding-top:64px;padding-bottom:64px;border-top:4px solid #DA2342}
.holo-box{position:relative;flex:0 1 480px;width:min(480px,100%);aspect-ratio:1;max-width:100%}
.holo-box .holo-hint{bottom:0}
.holo-sec h2{color:#FFF100}
.holo-save{display:inline-flex;align-items:center;min-height:44px;margin-top:10px;padding:8px 14px;border:3px solid #0A0A0A;background:#FFF100;color:#0A0A0A;font:800 15px Montserrat,Helvetica,Arial,sans-serif;text-decoration:none;box-shadow:3px 3px 0 #0A0A0A}
.pd-big.holo-live > img:not(.holo-thief){visibility:hidden}
.pd-big.holo-cloth{background:radial-gradient(ellipse at 50% 42%,#fafafa 0,#e9e9ea 45%,#c9cacd 100%)}
.pd-big:has(.holo-thief,.holo-line,.holo-say){overflow:hidden}
.holo-line{position:absolute;z-index:8;left:-4%;right:-4%;height:3px;background:#5a4632;border-radius:2px;box-shadow:0 2px 3px rgba(0,0,0,.25);pointer-events:none}
.holo-pin{position:absolute;z-index:10;width:9px;height:24px;translate:-50% -35%;background:#c79a5b;border:2px solid #0A0A0A;border-radius:2px;pointer-events:none}
.holo-thief{position:absolute;z-index:11;height:34%;width:auto;pointer-events:none;translate:-50% -30%;filter:drop-shadow(3px 4px 0 rgba(0,0,0,.35))}
.holo-poof{position:absolute;z-index:12;width:60%;aspect-ratio:1;translate:-50% -50%;pointer-events:none;
  background:radial-gradient(circle at 35% 40%,#fff 0 18%,transparent 19%),radial-gradient(circle at 62% 35%,#eee 0 20%,transparent 21%),radial-gradient(circle at 50% 62%,#f4f4f4 0 24%,transparent 25%),radial-gradient(circle at 28% 64%,#ddd 0 15%,transparent 16%),radial-gradient(circle at 72% 62%,#e8e8e8 0 16%,transparent 17%)}
.holo-poof b{position:absolute;left:50%;top:50%;translate:-50% -50%;rotate:-8deg;font:900 clamp(28px,6vw,52px)/1 Montserrat,Helvetica,Arial,sans-serif;color:#FFF100;-webkit-text-stroke:2px #0A0A0A;paint-order:stroke;text-shadow:3px 3px 0 #DA2342}
.holo-play{position:absolute;z-index:13;right:8px;bottom:8px;width:44px;height:44px;padding:0;border:3px solid #0A0A0A;background:#FFF100;color:#0A0A0A;font:900 22px/1 Montserrat,Helvetica,Arial,sans-serif;cursor:pointer;box-shadow:3px 3px 0 #0A0A0A}
.holo-play[hidden]{display:none}
.holo-finger{position:absolute;z-index:14;left:0;top:0;width:44px;height:44px;margin:-6px 0 0 -14px;pointer-events:none;opacity:0;transition:opacity .25s;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.35))}
.holo-finger.on{opacity:1}
.holo-finger::before{content:"";position:absolute;left:4px;top:-4px;width:20px;height:20px;border-radius:50%;border:3px solid #FFF100;opacity:0}
.holo-finger.press::before{animation:holo-tap .7s ease-out}
@keyframes holo-tap{0%{opacity:1;scale:.4}100%{opacity:0;scale:2.2}}
.holo-fs{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:radial-gradient(circle at 50% 38%,#fff,#e4e4e4 75%);overscroll-behavior:contain}
.holo-fs .holo-stage{position:relative;inset:auto;flex:1;min-height:0;opacity:1;z-index:1}
.holo-fs-top{position:absolute;z-index:5;top:calc(10px + env(safe-area-inset-top));left:10px;right:10px;display:flex;justify-content:space-between;pointer-events:none}
.holo-fs-top button{pointer-events:auto;width:48px;height:48px;border:3px solid #0A0A0A;background:#fff;color:#0A0A0A;font:900 24px/1 Montserrat,Helvetica,Arial,sans-serif;cursor:pointer;box-shadow:3px 3px 0 #0A0A0A}
.holo-fs-hint{position:absolute;z-index:3;left:50%;top:calc(70px + env(safe-area-inset-top));translate:-50% 0;margin:0;padding:8px 14px;background:#0A0A0A;color:#FFF100;font:800 13px/1.2 Montserrat,Helvetica,Arial,sans-serif;white-space:nowrap;pointer-events:none;transition:opacity .5s}
.holo-fs-buy{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:#0A0A0A;color:#fff}
.holo-fs-buy b{font:900 26px/1 Montserrat,Helvetica,Arial,sans-serif;color:#FFF100}
.holo-fs-buy span{display:block;font-size:13px;opacity:.8}
.holo-fs-buy button{min-height:48px;padding:10px 18px;border:3px solid #FFF100;background:#DA2342;color:#fff;font:800 16px Montserrat,Helvetica,Arial,sans-serif;cursor:pointer}
.holo-say{position:absolute;z-index:12;margin:0;padding:6px 10px;translate:-50% -100%;background:#fff;color:#0A0A0A;border:3px solid #0A0A0A;font:900 14px/1.15 Montserrat,Helvetica,Arial,sans-serif;white-space:nowrap;pointer-events:none;box-shadow:3px 3px 0 #0A0A0A;rotate:-3deg}
.holo-say[hidden]{display:none}
.holo-took{position:absolute;z-index:12;left:50%;top:12px;translate:-50% 0;margin:0;padding:8px 14px;background:#DA2342;color:#fff;font:800 14px/1.2 Montserrat,Helvetica,Arial,sans-serif;white-space:nowrap;rotate:-2deg;box-shadow:3px 3px 0 #0A0A0A}`;
  document.head.appendChild(css);

  // the spots: where it goes, and what it shows
  const spots = [];
  const collage = document.querySelector('.hero .collage');
  // the box flag floats over the whole hero: it rests where the collage was and can be dragged anywhere in it
  if (collage) spots.push({
    host: collage.closest('.hero') || collage, anchor: collage.closest('.hero') ? collage : null, hint: phone ? 'Grab it anywhere to twist and curl.' : 'Grab the box. Double-tap to crumple it.',
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
    // long-pressing a canvas can't save it, so the right sticker gets its own save button
    const save = document.createElement('a');
    save.className = 'holo-save';
    // PNG, not WebP: iPhone opens and posts PNG. tools/build_share.py pre-renders it; the share kit section names it.
    const stem = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    save.download = gif.dataset.stickerName || stem + '-sticker.png';
    if (gif.dataset.sticker) save.href = gif.dataset.sticker;
    else {
      // no pre-rendered PNG: draw the cutout to a canvas and save that as PNG
      save.href = '#';
      save.addEventListener('click', (ev) => {
        if (save.href.startsWith('blob:')) return;
        ev.preventDefault();
        const c = document.createElement('canvas');
        c.width = crewImg.naturalWidth; c.height = crewImg.naturalHeight;
        c.getContext('2d').drawImage(crewImg, 0, 0);
        c.toBlob((b) => { if (!b) return; save.href = URL.createObjectURL(b); save.click(); }, 'image/png');
      });
    }
    save.textContent = 'Save the sticker';
    sec.querySelector('p').after(save);
    gif.after(sec);
    // the sticker floats over the whole section: it rests in the box spot, but there's no box around it
    spots.push({
      host: sec, anchor: sec.querySelector('.holo-box'), hint: phone ? 'Grab it anywhere to twist and curl.' : 'Twist it. Double-tap to crumple.',
      opts: { preset: 'jb-sticker', clothImage: crewImg.currentSrc || crewImg.src, dieCut: true },
    });
  }
  // the Crossed B0ngs polos hang on a clothesline in the breeze, until the crew member who wears that color
  // runs in, grabs it and vanishes with it. The cutouts are assets/holo/polo-<id>.webp (made from the shop photo).
  const THIEF = { 672: 'bear', 696: 'devil', 720: 'grin' };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    while (alive() && (performance.now() - Math.max(touched, spot.touchedAt || 0) < 2500 || spot.full || stageBusy() || !stageClaim('thief'))) await wait(500);
    if (!alive()) { stageRelease('thief'); return; }
    const key = THIEF[spot.id];
    const who = Object.values((window.JBShop && window.JBShop.crew) || {}).find((c) => c.img === key);
    const thief = new Image();
    // Lil' Lucky's crew art is a full scene, so he runs in as his animation cutout instead
    const ANIM = { devil: 'assets/anim/devil/' };
    thief.src = ANIM[key] ? base + ANIM[key] + 'stand.webp' : base + 'assets/crew/' + key + '_m.webp';
    thief.alt = '';
    thief.className = 'holo-thief';
    await thief.decode().catch(() => {});
    if (!alive()) return;
    spot.busy = true; // hands off the cloth, no play button, while the thief is on
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
    if (ANIM[key]) thief.src = base + ANIM[key] + 'carry.webp';
    h.grabAt(.7, .16);
    h.release();
    h.wind(2);
    pins.forEach((p) => p.animate([{ translate: '-50% -35%', opacity: 1 }, { translate: '-50% 120%', rotate: '160deg', opacity: 0 }], { duration: 600, easing: 'ease-in', fill: 'forwards' }));
    const r0 = host.getBoundingClientRect(), x0 = parseFloat(thief.style.left), y0 = parseFloat(thief.style.top);
    await tween(1100, (k) => {
      const x = x0 + W * .14 * k * k, y = y0 - 20 * Math.sin(k * Math.PI); // a short yank: the POOF has to land in frame
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
    // the POOF is 60% of the stage wide and centered on its spot: keep the center between 30% and 70%
    poof.style.left = Math.min(W * .7, Math.max(W * .3, parseFloat(thief.style.left) + thief.offsetWidth / 2)) + 'px';
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
    stageRelease('thief');
    spot.extras = [took];
    await wait(3200);
    if (spot.holo !== null || spot.closed || !host.isConnected) return;
    took.remove();
    start(spot);
  };
  // the rest of the cloth (tees, hoodies, crop tops, towels, board shorts, the signature polo): the front photo's
  // cutout is the cloth (assets/holo/cloth-<id>.webp, trimmed from assets/shop/cut), so there is no white square,
  // and the crew member who wears it comes by to mess with it: wads it into a ball and bounces it, or grabs a
  // corner and snaps it out. Anybody touching it, or the full-screen viewer, and they leave it alone.
  const CLOTH = new Set([7622, 7570, 7498, 7406, 7399, 7392, 7354, 7333, 7326, 7263, 7247, 7220, 7206, 7192, 7178, 7117, 7053, 7045, 7041, 7037, 7033, 1122, 1070, 1018, 966, 914, 862, 852, 824, 586]);
  const ANIMS = new Set(['alien', 'bot', 'chimp', 'cy', 'devil', 'gorilla', 'lion', 'pumpkin']);
  const crewOf = (id) => {
    const S = window.JBShop || {}, p = (S.items || []).find((x) => String(x.id) === String(id));
    return (p && S.crew && S.crew[p.crew]) || null;
  };
  const mess = async (spot) => {
    const h = spot.holo, host = spot.host, c = crewOf(spot.id);
    if (!c) return;
    spot.stage.addEventListener('pointerdown', () => (spot.touchedAt = performance.now()));
    const anim = ANIMS.has(c.img);
    const fr = (f) => base + (anim ? 'assets/anim/' + c.img + '/' + f : 'assets/crew/' + c.img + '_m') + '.webp';
    await Promise.all((anim ? ['stand', 'walk1', 'walk2', 'walk3', 'reach', 'carry', 'hop', 'pose'] : ['']).map((f) => {
      const i = new Image(); i.src = fr(f); return i.decode().catch(() => {});
    }));
    const alive = () => spot.holo === h && host.isConnected;
    const towel = /^Towel/i.test((document.querySelector('#pdTitle') || {}).textContent || '');
    const acts = towel ? [shake, scrunch] : [scrunch, shake];
    for (let n = 0; n < acts.length; n++) {
      await wait(n ? 16000 : phone ? 3500 : 4500);
      while (alive() && (performance.now() - (spot.touchedAt || 0) < 3000 || spot.full || stageBusy() || !stageClaim('mess'))) await wait(500);
      if (!alive()) { stageRelease('mess'); return; }
      const t0 = performance.now();
      const ok = () => alive() && !spot.full && (spot.touchedAt || 0) < t0;
      const guy = new Image();
      guy.alt = '';
      guy.className = 'holo-thief';
      guy.src = fr('stand');
      guy.style.height = Math.round(host.clientHeight * .36) + 'px';
      const say = document.createElement('p');
      say.className = 'holo-say';
      say.hidden = true;
      host.append(guy, say);
      (spot.extras = spot.extras || []).push(guy, say);
      spot.busy = true;
      spot.yields = true; // a touch takes the cloth back and the crew member ducks out
      const R = () => host.getBoundingClientRect();
      const at = (u, v) => { const r = R(), p = h.screenAt(u, v); return { x: p.x - r.left, y: p.y - r.top }; };
      const pos = { x: 0, y: 0 };
      const put = (x, y, bob = 0) => {
        pos.x = x; pos.y = y;
        guy.style.left = x + 'px';
        guy.style.top = y - bob + 'px';
        if (!say.hidden) {
          say.style.left = Math.min(host.clientWidth - 80, Math.max(80, x)) + 'px';
          say.style.top = Math.max(40, y - guy.offsetHeight * .3 - 6) + 'px';
        }
      };
      const frame = (f) => { if (anim) guy.src = fr(f); };
      const talk = (t) => { say.textContent = t; say.hidden = false; put(pos.x, pos.y); };
      const walk = (to, ms) => {
        const from = { ...pos };
        guy.style.scale = to.x < from.x ? '-1 1' : '1 1';
        return tween(ms, (k) => {
          if (anim) guy.src = fr('walk' + (1 + (Math.floor(k * ms / 110) % 3)));
          put(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, Math.abs(Math.sin(k * Math.PI * 4)) * 12);
        });
      };
      // the cloth follows the hand (pullTo wants page coordinates)
      const drag = (x, y) => { const r = R(); h.pullTo(r.left + x, r.top + y); };
      const W = host.clientWidth, H = host.clientHeight;
      try {
        await acts[n]({ h, at, put, pos, walk, frame, talk, drag, ok, W, H });
      } finally {
        stageRelease('mess');
        try { h.letGo(); } catch (e) { /* already let go */ }
        if (alive()) {
          // walks off, or just ducks out if someone grabbed the cloth
          if (ok()) { say.hidden = true; await walk({ x: W * 1.3, y: pos.y }, 900); }
          guy.remove(); say.remove();
          spot.busy = false;
          spot.yields = false;
        }
      }
    }
  };
  // wad it into a ball, bounce it, toss it back: it unfolds
  async function scrunch({ h, at, put, pos, walk, frame, talk, drag, ok, W, H }) {
    const hem = at(.14, .84);
    put(-W * .3, hem.y);
    await walk(hem, 1000);
    if (!ok()) return;
    frame('reach');
    h.grabAt(.14, .84);
    await tween(450, (k) => drag(hem.x + W * .08 * k, hem.y - H * .06 * k));
    if (!ok()) return;
    talk('Needs a little wrinkle.');
    h.crumple();
    await wait(700);
    if (!ok()) return;
    frame('carry');
    const ball = at(.5, .5);
    await walk({ x: ball.x - W * .02, y: ball.y + H * .08 }, 700);
    if (!ok()) return;
    h.grabAt(.5, .5);
    talk('Ball is life.');
    const x0 = pos.x, y0 = pos.y;
    for (let b = 0; b < 3; b++) {
      frame(b % 2 ? 'carry' : 'hop');
      await tween(420, (k) => { const up = Math.sin(k * Math.PI); drag(x0, y0 - H * (.06 + .14 * up)); put(x0, y0, up * 16); });
      if (!ok()) return;
    }
    frame('pose');
    talk('Good as new.');
    await tween(380, (k) => drag(x0 + W * .05 * k, y0 - H * (.06 + .3 * k)));
    h.letGo();
    await h.snapBack(1400);
    await wait(500);
  }
  // grab a corner and snap it out like a fresh towel
  async function shake({ h, at, put, walk, frame, talk, drag, ok, W, H }) {
    const cor = at(.9, .22);
    put(W * 1.3, cor.y);
    await walk(cor, 1000);
    if (!ok()) return;
    frame('reach');
    h.grabAt(.9, .22);
    await wait(250);
    frame('carry');
    talk('Shake it out!');
    const x0 = cor.x, y0 = cor.y;
    await tween(1500, (k) => {
      const s = Math.sin(k * Math.PI * 7) * (1 - k * .6);
      const x = x0 + W * .08 * Math.min(1, k * 3), y = y0 + H * .16 * s;
      drag(x, y); put(x, y, Math.abs(s) * 6);
    });
    if (!ok()) return;
    frame('pose');
    talk('Fresh!');
    h.letGo();
    await h.snapBack(1000);
    await wait(700);
  }
  // in the merch detail view: the Classic Tee is heavy woven cloth you can grab, the polos hang in the breeze.
  // Mounted when it opens, dropped when it closes.
  const views = [
    { dlg: '#pd', name: '#pdTitle', test: /^(Classic Tee|Hoodie|Cotton Crop Top|Towel|Polo – JB|Men’s Board Shorts)/i, host: '.pd-big', img: '#pdImg',
      // the front photo only: it's the one with a cutout
      src: (src) => { const m = src.match(/shop\/(\d+)_0\.webp/); return m && CLOTH.has(+m[1]) ? { id: m[1], src: base + 'assets/holo/cloth-' + m[1] + '.webp' } : null; },
      hint: phone ? 'Grab it anywhere to twist and curl.' : 'Grab it. Double-tap to crumple. ⤢ to spin it.', scene: mess,
      opts: { preset: 'jb-fabric', dieCut: true, stiff: true, snapBack: 2500 } },
    { dlg: '#pd', name: '#pdTitle', test: /^Polo – Crossed B[o0]ngs/i, host: '.pd-big', img: '#pdImg',
      // only the front photo has a cutout
      src: (src) => { const m = src.match(/shop\/(\d+)_0\.webp/); return m && THIEF[m[1]] ? { id: m[1], src: base + 'assets/holo/polo-' + m[1] + '.webp' } : null; },
      hint: phone ? 'Grab it anywhere to twist and curl.' : 'Grab the polo. ⤢ to spin it.', scene: snatch,
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
    stage.className = 'holo-stage' + (spot.anchor ? ' float' : '');
    if (spot.anchor) { spot.host.classList.add('holo-float'); spot.anchor.classList.add('holo-anchor'); }
    const hint = document.createElement('p');
    hint.className = 'holo-hint';
    hint.textContent = spot.hint;
    spot.host.append(stage);
    if (spot.hint) (spot.anchor || spot.host).append(hint);
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
          if (spot.anchor) spot.anchor.classList.add('holo-live');
          if (spot.opts.dieCut && spot.host.classList.contains('pd-big')) spot.host.classList.add('holo-cloth'); // white tees need a shade behind them
          stage.classList.add('on');
          setTimeout(() => (hint.style.opacity = '0'), 5000);
          decorate(spot);
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
  window.JBHoloSpots = () => spots.concat(views).map((s) => s.holo).filter((h) => h && h.pause);
  // a background tab draws nothing: pause every cloth, and wake the ones on screen when it comes back
  document.addEventListener('visibilitychange', () => {
    for (const s of spots.concat(views)) {
      const h = s.holo;
      if (!h || !h.pause) continue;
      if (document.hidden) h.pause(); else if (s.seen !== false) h.resume();
    }
  });

  // which bit of cloth is under a screen point? Project a grid of the cloth's (u,v) points to the screen, find the
  // little triangle the point is in, and (for die-cut art) check the picture isn't see-through there.
  const N = 10;
  function clothAt(spot, x, y) {
    const h = spot.holo, P = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) P.push(h.screenAt(i / N, j / N));
    const tri = (a, b, c, ua, ub, uc) => {
      const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(d) < 1e-6) return null;
      const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / d;
      const l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) return null;
      return [l1 * ua[0] + l2 * ub[0] + l3 * uc[0], l1 * ua[1] + l2 * ub[1] + l3 * uc[1]];
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * (N + 1) + i, a = P[k], b = P[k + 1], c = P[k + N + 1], e = P[k + N + 2];
      const u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N;
      const uv = tri(a, b, c, [u0, v0], [u1, v0], [u0, v1]) || tri(e, c, b, [u1, v1], [u0, v1], [u1, v0]);
      if (uv && solid(spot, uv)) return uv;
    }
    return null;
  }
  // die-cut art: a tiny copy of the picture's alpha, so a touch on the see-through part scrolls the page
  function solid(spot, [u, v]) {
    const m = spot.mask;
    if (!spot.opts.dieCut) return true;
    if (!m) return true; // not read yet: count it
    const x = Math.min(m.w - 1, Math.max(0, Math.floor(u * m.w))), y = Math.min(m.h - 1, Math.max(0, Math.floor(v * m.h)));
    // a little slack around the edge so it's easy to catch
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && m.a[(yy * m.w + xx) * 4 + 3] > 40) return true;
    }
    return false;
  }
  function readMask(spot) {
    if (!spot.opts.dieCut || !spot.opts.clothImage) return;
    const img = new Image();
    img.onload = () => {
      const w = 48, hh = Math.max(8, Math.round(48 * img.naturalHeight / img.naturalWidth));
      const c = document.createElement('canvas');
      c.width = w; c.height = hh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, w, hh);
      try { spot.mask = { w, h: hh, a: g.getImageData(0, 0, w, hh).data }; } catch (e) { /* cross-origin: count it all */ }
    };
    img.src = spot.opts.clothImage;
  }

  // clothes: stiffer than a flag, lying on a surface. Tilted back a little, a halftone dot shadow under it, and when
  // nobody's holding it gravity eases it back down flat; a few seconds after it's let go it's fully unfurled.
  function lieFlat(spot) {
    const h = spot.holo, app = h.app, alive = () => spot.holo === h && spot.host.isConnected;
    if (app.params && app.params.physics) Object.assign(app.params.physics, { viscosity: .22, stiffness: 1, iterations: 18, smoothing: .03 });
    app.camera.position.set(0, -1.3, 5.3);
    app.controls.target.set(0, 0, 0);
    app.controls.update();
    const dots = () => { if (window.JBHalftone && alive()) spot.stage.style.filter = `url(#${window.JBHalftone(7, 9)})`; };
    window.JBHalftone ? dots() : setTimeout(dots, 1500);
    let held = false, up = performance.now();
    spot.stage.addEventListener('pointerdown', () => { held = true; }, true);
    const release = () => { if (held) { held = false; up = performance.now(); } };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    const tick = () => {
      if (!alive()) return;
      const idle = performance.now() - Math.max(up, spot.touchedAt || 0);
      if (!held && !spot.busy && !spot.demo && !spot.full && idle > 900 && app.sim) app.sim.settle(idle > 2500 ? .08 : .012);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // a finger shows how: presses on the cloth, tugs it, lets go. Once or twice a visit, not every time.
  async function coach(spot) {
    let n = 0;
    try { n = +sessionStorage.getItem('holo-coach') || 0; sessionStorage.setItem('holo-coach', n + 1); } catch (e) { /* private mode */ }
    if (n >= 2 || reduce) return;
    const h = spot.holo, host = spot.host, alive = () => spot.holo === h && host.isConnected && !spot.full && !spot.busy;
    await wait(1100);
    if (!alive() || performance.now() - (spot.touchedAt || -1e9) < 3000) return;
    const [u, v] = spot.opts.hang ? [.5, .8] : [.66, .62];
    const r = host.getBoundingClientRect(), p0 = h.screenAt(u, v);
    const x0 = p0.x - r.left, y0 = p0.y - r.top;
    const f = document.createElement('i');
    f.className = 'holo-finger';
    f.innerHTML = '<svg viewBox="0 0 44 44" width="44" height="44"><path d="M14 4c2.2 0 4 1.8 4 4v12l2-.6c1.8-.5 3.6.5 4.2 2.2l.3.9 1.8-.5c1.9-.5 3.8.6 4.3 2.4l.2.8 1.4-.3c2-.4 3.9.9 4.3 2.9l1.2 6.5c.6 3.3-.6 6.6-3.2 8.6L32 44H17l-8.6-9.4c-1.4-1.6-1.4-4 .1-5.5 1.5-1.4 3.8-1.4 5.3 0l.2.2V8c0-2.2 1.8-4 4-4z" transform="translate(-4 -2) scale(.98)" fill="#fff" stroke="#0A0A0A" stroke-width="2.6" stroke-linejoin="round"/></svg>';
    host.append(f);
    const pos = (x, y) => { f.style.transform = `translate(${x}px,${y}px)`; };
    pos(x0 + 30, y0 + 40);
    f.classList.add('on');
    try {
      await tween(450, (k) => pos(x0 + 30 * (1 - k), y0 + 40 * (1 - k)));
      if (!alive()) return;
      f.classList.add('press');
      spot.demo = true;
      h.grabAt(u, v);
      const dx = -Math.min(70, r.width * .16), dy = -Math.min(50, r.height * .1);
      await tween(900, (k) => {
        const e = Math.sin(k * Math.PI * 1.5) * (k < .67 ? 1 : 1 - (k - .67) * 3);
        const x = x0 + dx * Math.sin(k * Math.PI), y = y0 + dy * e;
        pos(x, y);
        if (alive()) h.pullTo(r.left + x, r.top + y);
      });
    } finally {
      try { h.letGo(); } catch (e) { /* gone */ }
      spot.demo = false;
      spot.touchedAt = performance.now() - 1500; // let it settle soon after the demo
      f.classList.remove('on');
      setTimeout(() => f.remove(), 300);
      if (alive() && !spot.opts.hang && spot.opts.snapBack !== false) h.snapBack(900);
    }
  }

  /* ---------------------------------------------------------------- touch: on the page, grab the cloth anywhere
     A phone keeps scrolling the page except where a finger lands on the cloth itself: that touch holds the cloth
     (double-tap crumples it). No spin or zoom on the page (the desktop wheel scrolls the page again). The ⤢ button
     opens it full screen, where one finger on the cloth grabs it, one finger off it spins, and a pinch zooms. */
  function decorate(spot) {
    const h = spot.holo, host = spot.host, ctl = h.app.controls;
    const alive = () => spot.holo === h && host.isConnected;
    ctl.enableZoom = false;
    ctl.enablePan = false;
    if (phone) ctl.enableRotate = false;
    const extras = [];
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'holo-play';
    play.textContent = '⤢';
    play.setAttribute('aria-label', 'Play with it full screen');
    play.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); full(spot); });
    (spot.anchor || host).append(play);
    extras.push(play);
    if (spot.anchor) floatOver(spot);
    readMask(spot);
    if (spot.opts.stiff) lieFlat(spot);
    if (phone) {
      // floating: the stage lets touches through, so the section listens and keeps the ones that land on the cloth
      const stage = spot.anchor ? host : spot.stage;
      let snap = 0, held = false, lastTap = 0;
      // on the page the engine's own touch handling stays out of it (it would fight the page scroll)
      stage.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !spot.full) e.stopPropagation(); }, true);
      stage.addEventListener('touchstart', (e) => {
        if (spot.full || (spot.busy && !spot.yields) || !alive() || e.touches.length > 1) return;
        const t = e.touches[0], uv = clothAt(spot, t.clientX, t.clientY);
        if (!uv) return; // off the cloth: the page scrolls
        e.preventDefault(); // this touch belongs to the cloth, not the page scroll
        clearTimeout(snap);
        spot.touchedAt = performance.now();
        if (spot.touchedAt - lastTap < 350 && !spot.opts.hang && spot.opts.crumpleOnDoubleTap !== false) { lastTap = 0; h.crumple(); return; }
        lastTap = spot.touchedAt;
        held = true;
        h.grabAt(uv[0], uv[1]);
      }, { passive: false });
      stage.addEventListener('touchmove', (e) => {
        if (!held) return;
        e.preventDefault();
        const t = e.touches[0];
        spot.touchedAt = performance.now();
        h.pullTo(t.clientX, t.clientY);
      }, { passive: false });
      const end = () => {
        if (!held) return;
        held = false;
        h.letGo();
        spot.touchedAt = performance.now();
        if (!spot.opts.hang && spot.opts.snapBack !== false) snap = setTimeout(() => alive() && !held && h.snapBack(900), 3500);
      };
      stage.addEventListener('touchend', end);
      stage.addEventListener('touchcancel', end);
    }
    coach(spot);
    const sync = () => { if (!alive()) return; play.hidden = !!(spot.busy || spot.full); setTimeout(sync, 300); };
    sync();
    spot.ui = extras; // kept apart from spot.extras, which the snatch scene resets
  }

  /* floating: the canvas is the size of the whole section, but the camera still frames the cloth as if the canvas
     were only the anchor's box (a view offset), so it rests in the same spot at the same size and can be dragged
     anywhere over the section. On desktop the stage only takes the pointer while it's over the cloth. */
  function floatOver(spot) {
    const h = spot.holo, cam = h.app.camera, orig = cam.updateProjectionMatrix, stage = spot.stage;
    const alive = () => spot.holo === h && spot.host.isConnected;
    cam.updateProjectionMatrix = function () {
      const s = stage.getBoundingClientRect(), a = spot.anchor.getBoundingClientRect();
      if (!spot.full && s.width && s.height && a.width && a.height) {
        this.aspect = a.width / a.height;
        this.view = { enabled: true, fullWidth: a.width, fullHeight: a.height, offsetX: s.left - a.left, offsetY: s.top - a.top, width: s.width, height: s.height };
      } else if (this.view) this.view.enabled = false;
      return orig.call(this);
    };
    cam.updateProjectionMatrix();
    const ro = new ResizeObserver(() => alive() && !spot.full && cam.updateProjectionMatrix());
    ro.observe(spot.anchor);
    ro.observe(spot.host);
    spot.refit = () => cam.updateProjectionMatrix();
    if (phone) return;
    let raf = 0, last = null;
    const check = () => {
      raf = 0;
      if (!alive() || !last) return;
      const held = last.buttons && stage.classList.contains('hit');
      stage.classList.toggle('hit', !spot.full && (held || (!spot.busy && !!clothAt(spot, last.clientX, last.clientY))));
    };
    spot.host.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; last = e; if (!raf) raf = requestAnimationFrame(check); });
    spot.host.addEventListener('pointerleave', (e) => { if (!e.buttons) stage.classList.remove('hit'); });
    addEventListener('pointerup', () => { if (last) { last = { clientX: last.clientX, clientY: last.clientY, buttons: 0 }; check(); } });
  }

  // full screen: moves the stage into an overlay (the WebGL canvas resizes with it) and back again
  function full(spot) {
    const h = spot.holo;
    if (!h || !h.app || spot.full) return;
    const ctl = h.app.controls, cam = h.app.camera, stage = spot.stage, canvas = stage.querySelector('canvas');
    const keep = {
      pos: cam.position.clone(), tgt: ctl.target.clone(), rot: ctl.enableRotate, zoom: ctl.enableZoom, pan: ctl.enablePan,
      min: ctl.minDistance, max: ctl.maxDistance, minP: ctl.minPolarAngle, maxP: ctl.maxPolarAngle,
      ta: canvas.style.touchAction, ov: document.documentElement.style.overflow,
    };
    spot.full = true;
    window.JBHoloFull = true;
    const mark = document.createComment('holo');
    stage.before(mark);
    const fs = document.createElement('div');
    fs.className = 'holo-fs';
    fs.setAttribute('role', 'dialog');
    fs.setAttribute('aria-label', 'Holo viewer');
    fs.innerHTML = '<div class="holo-fs-top"><button type="button" class="x" aria-label="Close">×</button><button type="button" class="r" aria-label="Reset the view">↺</button></div>' +
      '<p class="holo-fs-hint">' + (phone ? 'Drag it · spin around it · pinch to zoom' : 'Drag it · spin around it · scroll to zoom') + '</p>';
    fs.append(stage);
    // the buy bar comes along in the merch view
    const price = spot.host.closest('#pd') && document.querySelector('#pd .pd-price');
    let close = () => {};
    if (price) {
      const title = document.querySelector('#pdTitle');
      const bar = document.createElement('div');
      bar.className = 'holo-fs-buy';
      bar.innerHTML = '<div><b></b><span></span></div><button type="button">Add to cart</button>';
      bar.querySelector('b').textContent = price.textContent;
      bar.querySelector('span').textContent = title ? title.textContent : '';
      bar.querySelector('button').addEventListener('click', () => {
        close();
        const buy = document.getElementById('pdBuy');
        if (buy && !buy.hasAttribute('aria-disabled') && buy.href) buy.click();
        else (document.querySelector('#pd .opt') || buy)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); // pick a size first
      });
      fs.append(bar);
    }
    (document.querySelector('dialog[open]') || document.body).append(fs);
    document.documentElement.style.overflow = 'hidden';
    canvas.style.touchAction = 'none';
    ctl.enableRotate = true;
    ctl.enableZoom = true;
    ctl.enablePan = false;
    const d = cam.position.distanceTo(ctl.target);
    ctl.minDistance = d / 2.5;
    ctl.maxDistance = d / 0.6;
    ctl.minPolarAngle = Math.PI / 2 - 0.9;
    ctl.maxPolarAngle = Math.PI / 2 + 0.55; // can't flip under the line
    ctl.update();
    setTimeout(() => { const t = fs.querySelector('.holo-fs-hint'); if (t) t.style.opacity = '0'; }, 3000);
    const reset = () => { cam.position.copy(keep.pos); ctl.target.copy(keep.tgt); ctl.update(); };
    fs.querySelector('.r').addEventListener('click', reset);
    // the phone's back gesture closes it
    history.pushState({ holoFull: 1 }, '');
    let done = false;
    const exit = () => {
      if (done) return;
      done = true;
      removeEventListener('popstate', exit);
      removeEventListener('keydown', esc);
      reset();
      Object.assign(ctl, { enableRotate: keep.rot, enableZoom: keep.zoom, enablePan: keep.pan, minDistance: keep.min, maxDistance: keep.max, minPolarAngle: keep.minP, maxPolarAngle: keep.maxP });
      ctl.update();
      canvas.style.touchAction = keep.ta;
      document.documentElement.style.overflow = keep.ov;
      if (mark.isConnected) mark.replaceWith(stage); else stop(spot);
      fs.remove();
      spot.full = false;
      if (spot.refit) requestAnimationFrame(spot.refit);
      setTimeout(() => { window.JBHoloFull = false; }, 0);
    };
    close = () => { if (history.state && history.state.holoFull) history.back(); else exit(); };
    const esc = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    addEventListener('popstate', exit);
    addEventListener('keydown', esc);
    fs.querySelector('.x').addEventListener('click', () => close());
  }

  function stop(spot, keep) {
    if (spot.holo && spot.holo.dispose) spot.holo.dispose();
    spot.holo = null;
    if (spot.stage) spot.stage.remove();
    if (spot.hintEl) spot.hintEl.remove();
    (spot.extras || []).forEach((el) => el.remove());
    (spot.ui || []).forEach((el) => el.remove());
    spot.ui = [];
    spot.extras = [];
    spot.busy = false;
    if (!keep) spot.closed = true;
    spot.host.classList.remove('holo-live', 'holo-cloth');
    if (spot.anchor) spot.anchor.classList.remove('holo-live');
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
