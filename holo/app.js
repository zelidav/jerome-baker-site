/* JB Holo: one holo sticker (or the box flag), full screen, nothing else. Installable (holo.webmanifest + sw.js),
   so it opens from a phone's home screen with no browser chrome, and plain enough to run as a desktop wallpaper.
   ?s=<crew slug|box>  which one       ?bg=<hex|transparent>  the background (hex without the #)
   ?idle=0             no idle motion   ?ui=0                  no controls at all (wallpaper / screensaver use)
   ?holo=0 / ?holo=1   the site's kill switch, same session key as js/holo/sample.js */
(() => {
  const q = new URLSearchParams(location.search);
  try { if (q.has('holo')) sessionStorage.setItem('jb-holo', q.get('holo')); } catch (e) { /* storage blocked */ }
  let kill = null;
  try { kill = sessionStorage.getItem('jb-holo'); } catch (e) { /* storage blocked */ }

  const A = '../assets/';
  const STICKERS = [
    { s: 'box', name: 'The box', img: A + 'img/box.webp', thumb: A + 'img/box.webp', preset: 'jb-poster', dieCut: false },
    ...[
      ['torch', 'Torch', 'lion'], ['lunar-larry', 'Lunar Larry', 'chimp'], ['chomps', 'Chomps', 'shark'], ['ocho', 'Ocho', 'octo'],
      ['dj-rivets', 'DJ Rivets', 'bot'], ['sticky-ricky', 'Sticky Ricky', 'bear'], ['big-bill', 'Big Bill', 'toucan'],
      ['crude', 'Crude', 'crude'], ['beamer', 'Beamer', 'alien'], ['mama-cobra', 'Mama Cobra', 'cobra'],
      ['lil-lucky', "Lil' Lucky", 'devil'], ['big-stitch', 'Big Stitch', 'gorilla'], ['gourdo', 'Gourdo', 'pumpkin'],
      ['gutterball', 'Gutterball', 'dillo'], ['speedbump', 'Speedbump', 'turtle'], ['dr-squint', 'Dr. Squint', 'cy'],
      ['the-zone-outs', 'The Zone-Outs', 'spinners'], ['lookie-lou', 'Lookie Lou', 'peeper'], ['mr-x', 'Mr. X', 'mrx'],
      ['mouthy', 'Mouthy', 'grin'],
    ].map(([s, name, f]) => ({ s, name, img: A + 'crew/' + f + '.webp', thumb: A + 'crew/' + f + '_s.webp', preset: 'jb-sticker', dieCut: true })),
  ];
  const SWATCHES = ['0b0c12', '233671', 'DA2342', 'FCD804', 'f2f2f2', 'transparent'];

  const $ = (id) => document.getElementById(id);
  const stageEl = $('stage'), ui = $('ui'), more = $('more'), hint = $('hint'), toast = $('toast');
  const phone = Math.min(innerWidth, innerHeight) < 768 || matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const weak = (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  const showUI = q.get('ui') !== '0';
  let idle = q.get('idle') !== '0' && !reduce;
  let cur = STICKERS.find((x) => x.s === q.get('s')) || STICKERS.find((x) => x.s === 'torch');
  let bg = (q.get('bg') || '0b0c12').replace(/^#/, '');
  if (bg !== 'transparent' && !/^[0-9a-f]{3,8}$/i.test(bg)) bg = '0b0c12';

  const setParam = () => {
    const u = new URL(location.href);
    u.searchParams.set('s', cur.s);
    u.searchParams.set('bg', bg);
    history.replaceState(null, '', u);
  };
  const say = (t, ms = 1800) => { toast.textContent = t; toast.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => (toast.hidden = true), ms); };
  const applyBg = () => {
    const clear = bg === 'transparent';
    document.documentElement.classList.toggle('clear', clear);
    document.documentElement.style.setProperty('--bg', clear ? 'transparent' : '#' + bg);
    document.querySelector('meta[name=theme-color]').content = clear ? '#0b0c12' : '#' + bg;
    $('sw').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.bg === bg));
  };

  // controls
  if (!showUI) { ui.hidden = true; more.remove(); hint.remove(); }
  $('strip').innerHTML = STICKERS.map((x) => `<button type="button" role="option" data-s="${x.s}" aria-label="${x.name}" title="${x.name}"><img src="${x.thumb}" alt="" loading="lazy"></button>`).join('');
  $('sw').innerHTML = SWATCHES.map((c) => `<button type="button" data-bg="${c}" aria-label="${c === 'transparent' ? 'Clear background' : 'Background #' + c}" ${c === 'transparent' ? 'class="tr"' : `style="background:#${c}"`}></button>`).join('');
  const markPick = () => $('strip').querySelectorAll('button').forEach((b) => { const on = b.dataset.s === cur.s; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  $('strip').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b || b.dataset.s === cur.s) return; cur = STICKERS.find((x) => x.s === b.dataset.s); markPick(); setParam(); mount(); });
  $('sw').addEventListener('click', (e) => { const b = e.target.closest('[data-bg]'); if (!b) return; bg = b.dataset.bg; applyBg(); setParam(); });
  // the controls fade out after a few quiet seconds; the ••• button brings them back
  let dimT = 0;
  const wake = () => { if (!showUI) return; ui.classList.remove('dim'); more.classList.remove('on'); clearTimeout(dimT); dimT = setTimeout(() => { ui.classList.add('dim'); more.classList.add('on'); }, 5000); };
  ui.addEventListener('pointerdown', wake);
  more.addEventListener('click', wake);
  $('hide').addEventListener('click', () => { clearTimeout(dimT); ui.classList.add('dim'); more.classList.add('on'); });
  $('fs').addEventListener('click', () => {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else { const el = d.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen || (() => say('Add it to your home screen for full screen'))).call(el); }
  });
  if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone) $('fs').hidden = true;

  // the still: no WebGL2, the kill switch, or reduced motion / a weak device (those two can still turn it on)
  const still = (why, canForce) => {
    stageEl.innerHTML = '';
    const s = $('still');
    s.querySelector('img').src = cur.img;
    s.querySelector('img').alt = cur.name;
    s.querySelector('p').textContent = why;
    $('anyway').hidden = !canForce;
    s.classList.add('on');
    ['loop', 'png'].forEach((id) => ($(id).hidden = true));
  };
  $('anyway').addEventListener('click', () => { $('still').classList.remove('on'); ['loop', 'png'].forEach((id) => ($(id).hidden = false)); forced = true; mount(); });
  let forced = false;

  let lib = null, h = null, sway = null, gen = 0;
  const loadLib = () => lib || (lib = import(new URL('../js/holo/holo.js', location.href).href).then(() => window.JBHolo));

  async function mount() {
    const my = ++gen;
    $('still').querySelector('img').src = cur.img; // keeps the still in step with the pick
    if (kill === '0') return still('The holo is switched off for this visit.', false);
    if (!forced && (reduce || weak)) return still(reduce ? 'Your device asks for less motion, so here is the flat sticker.' : 'Here is the flat sticker. The holo one is heavy on older devices.', true);
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) return still('This browser has no WebGL2, so here is the flat sticker.', false);
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    let mountHoloCloth;
    try { ({ mountHoloCloth } = await loadLib()); } catch (e) { return still('The holo did not load. Check the connection and try again.', false); }
    if (my !== gen) return;
    if (h) { try { h.dispose(); } catch (e) { /* gone */ } h = null; }
    stageEl.innerHTML = '';
    h = mountHoloCloth(stageEl, {
      preset: cur.preset, clothImage: cur.img, dieCut: cur.dieCut,
      transparentBg: true, pokeOnEnter: true, crumpleOnDoubleTap: true, snapBack: 3500,
      performance: phone ? 'Low' : 'High', touchAction: 'none',
      onReady: (api) => { if (my === gen) ready(api); },
    });
  }

  function ready(api) {
    const ctl = api.app.controls, cam = api.app.camera;
    ctl.enableRotate = true; ctl.enableZoom = true; ctl.enablePan = false;
    // the library frames it for a landscape box: on a tall screen back the camera off so the whole sticker fits across
    // and its target sits off to one side (it is set up for a page column): aim at the middle of the cloth instead
    try {
      const g = api.app.clothGeometry; g.computeBoundingBox();
      const c = g.boundingBox.getCenter(ctl.target.clone()), off = cam.position.clone().sub(ctl.target);
      ctl.target.set(c.x, c.y, ctl.target.z);
      cam.position.copy(ctl.target).add(off);
    } catch (e) { /* keep the library framing */ }
    const d0 = cam.position.distanceTo(ctl.target);
    const fit = () => {
      const asp = stageEl.clientWidth / Math.max(1, stageEl.clientHeight);
      const d = asp < 1.15 ? d0 * Math.min(2.6, 1.05 / asp) : d0;
      const dir = cam.position.clone().sub(ctl.target).normalize();
      cam.position.copy(ctl.target).addScaledVector(dir, d);
      ctl.minDistance = d / 2.5; ctl.maxDistance = d / 0.6;
      ctl.update();
      return d;
    };
    ctl.minPolarAngle = Math.PI / 2 - 0.9; ctl.maxPolarAngle = Math.PI / 2 + 0.55;
    fit();
    let rz = 0;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (h === api) { fit(); resting = false; touched = 0; } }, 200); });
    // idle: the camera sways a little around it and every few seconds it gets a nudge, so it is never dead still
    const canvas = stageEl.querySelector('canvas');
    let touched = performance.now(), base = cam.position.clone().sub(ctl.target), t0 = performance.now(), held = false;
    const touch = () => { touched = performance.now(); held = true; };
    canvas.addEventListener('pointerdown', touch);
    addEventListener('pointerup', () => { held = false; touched = performance.now(); });
    ctl.addEventListener('start', touch);
    ctl.addEventListener('end', () => { held = false; touched = performance.now(); });
    let resting = true, n = 0, lastNudge = performance.now();
    cancelAnimationFrame(sway);
    const step = (now) => {
      sway = requestAnimationFrame(step);
      if (!idle || held || document.hidden) return;
      const quiet = now - touched > 6000;
      if (!quiet) { resting = false; return; }
      if (!resting) { resting = true; base = cam.position.clone().sub(ctl.target); t0 = now; } // pick up from wherever it was left
      const a = 0.32 * Math.sin((now - t0) / 4200), b = 0.08 * Math.sin((now - t0) / 6100);
      const p = base.clone().applyAxisAngle(cam.up, a);
      p.y += b * base.length();
      cam.position.copy(ctl.target).add(p);
      cam.lookAt(ctl.target);
      if (api.wake) api.wake(); // the render loop sleeps at rest: the sway moves the camera from outside
      if (now - lastNudge > 7000) {
        lastNudge = now; n++;
        if (n % 4 === 0) api.crumple(); else api.poke(0.55); // it snaps back out on its own
      }
    };
    sway = requestAnimationFrame(step);
    if (showUI) setTimeout(() => hint.classList.add('gone'), 4500);
  }

  // Save a loop: about 6 seconds of the canvas, mp4 where the browser can make one (Safari, newer Chrome), else webm
  let recording = false;
  const pickType = () => ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  const deliver = async (blob, name) => {
    const file = new File([blob], name, { type: blob.type });
    if (phone && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'JB Holo' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };
  $('loop').addEventListener('click', async () => {
    if (recording || !h || !h.app) return;
    const canvas = stageEl.querySelector('canvas'), type = pickType();
    if (!canvas || !canvas.captureStream || !type) return say('This browser can’t record video. Try Chrome or Safari.', 2600);
    recording = true;
    const btn = $('loop');
    btn.disabled = true; btn.textContent = 'Recording…';
    $('rec').classList.add('on');
    ui.classList.add('dim'); more.classList.remove('on');
    // a video has no see-through: paint the background into the scene while it records
    const app = h.app, clear = bg === 'transparent';
    app.background.set('#' + (clear ? '0b0c12' : bg.slice(0, 6)));
    app.scene.background = app.background;
    // frames are pushed by hand right after each render (captureStream(0) + requestFrame), which is steadier than a
    // timed capture on a WebGL canvas that doesn't keep its drawing buffer
    if (h.keepAwake) { h.keepAwake(true); h.setMaxFps(60); } // full rate, no sleeping, while it records
    const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0];
    let pump = 0;
    const push = () => { pump = requestAnimationFrame(push); track.requestFrame && track.requestFrame(); };
    pump = requestAnimationFrame(push);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8e6 });
    const parts = [];
    rec.ondataavailable = (e) => e.data && e.data.size && parts.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(250);
    h.poke(0.9);
    setTimeout(() => h && h.crumple(), 2600); // it crumples halfway and opens back out before the end
    await new Promise((r) => setTimeout(r, 6200));
    rec.stop();
    await done;
    cancelAnimationFrame(pump);
    if (h && h.keepAwake) { h.keepAwake(false); h.setMaxFps(30); }
    stream.getTracks().forEach((t) => t.stop());
    if (h && h.app) h.app.scene.background = null;
    recording = false;
    btn.disabled = false; btn.textContent = 'Save a loop';
    $('rec').classList.remove('on');
    wake();
    const blob = new Blob(parts, { type: type.split(';')[0] });
    if (!blob.size) return say('Nothing recorded. Try again.');
    await deliver(blob, `jb-holo-${cur.s}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
  });
  // Save PNG: a big see-through PNG of it as it sits right now (icons, stickers, wallpapers)
  $('png').addEventListener('click', () => { if (h && h.app) h.app.exportPNG(true); });

  document.addEventListener('visibilitychange', () => { if (!h) return; document.hidden ? h.pause() : h.resume(); });

  // offline: the worker keeps the holo bundle and the stickers
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});

  applyBg(); markPick(); setParam(); wake(); mount();
  window.JBHoloApp = { get holo() { return h; }, get sticker() { return cur.s; } };
})();
