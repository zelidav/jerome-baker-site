/* Full-screen photo zoom, shared by the glass bench and the merch product view.
   JBZoom.open({ photos: [{ src, alt, w?, h? }], index, at: [fx, fy] })
   Pinch, scroll wheel or double-tap to zoom right where you point; drag to look around; + / − / Fit buttons;
   more than one photo shows a strip to switch between them. `at` opens already zoomed in on that spot of the
   photo (fractions of its width and height). */
(() => {
  if (window.JBZoom) return;
  const css = document.createElement('style');
  css.textContent = `
.jbz{border:0;padding:0;margin:0;width:100vw;height:100dvh;max-width:none;max-height:none;background:#14183a;color:#fff;overflow:hidden}
.jbz::backdrop{background:rgba(10,10,10,.85)}
.jbz-stage{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:zoom-in;user-select:none;-webkit-user-select:none}
.jbz-stage.in{cursor:grab}.jbz-stage.drag{cursor:grabbing}
.jbz-stage img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none;pointer-events:none;will-change:transform;image-rendering:auto}
.jbz-stage img.ease{transition:transform .28s cubic-bezier(.2,.7,.2,1)}
.jbz-bar{position:absolute;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;gap:8px;z-index:3}
.jbz-bar button,.jbz-x{min-width:48px;min-height:48px;border:3px solid #0A0A0A;background:#FCD804;color:#0A0A0A;font:900 22px/1 Montserrat,system-ui,sans-serif;cursor:pointer;box-shadow:4px 4px 0 #0A0A0A}
.jbz-bar .fit{font-size:14px;padding:0 12px}
.jbz-x{position:absolute;right:14px;top:calc(14px + env(safe-area-inset-top));z-index:3;background:#fff}
.jbz-hint{position:absolute;left:14px;top:calc(14px + env(safe-area-inset-top));z-index:3;margin:0;max-width:calc(100% - 100px);background:#FCD804;color:#0A0A0A;border:3px solid #0A0A0A;padding:8px 12px;font:800 14px/1.3 Montserrat,system-ui,sans-serif;transition:opacity .5s}
.jbz-hint.gone{opacity:0;pointer-events:none}
.jbz-pct{position:absolute;left:50%;top:calc(18px + env(safe-area-inset-top));translate:-50% 0;z-index:3;background:rgba(10,10,10,.7);padding:4px 10px;font:700 13px JetBrains Mono,monospace;opacity:0;transition:opacity .3s}
.jbz-pct.on{opacity:1}
.jbz-cap{position:absolute;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));translate:-50% 0;z-index:3;margin:0;max-width:calc(100% - 28px);background:#0A0A0A;color:#FCD804;border:3px solid #FCD804;padding:6px 12px;font:800 14px/1.2 Montserrat,system-ui,sans-serif;text-align:center;pointer-events:none}
.jbz-cap[hidden]{display:none}
@media (max-width:560px){.jbz-cap{bottom:calc(146px + env(safe-area-inset-bottom))}}
.jbz-strip{position:absolute;left:14px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;gap:6px;z-index:3;max-width:calc(100% - 230px);overflow-x:auto}
.jbz-strip button{flex:none;width:52px;height:52px;padding:0;border:3px solid #0A0A0A;background:#fff;cursor:pointer;opacity:.7}
.jbz-strip button.on{opacity:1;outline:3px solid #FCD804}
.jbz-strip img{width:100%;height:100%;object-fit:contain}
@media (max-width:560px){.jbz-strip{bottom:calc(78px + env(safe-area-inset-bottom));max-width:calc(100% - 28px)}}`;
  document.head.append(css);

  const dlg = document.createElement('dialog');
  dlg.className = 'jbz';
  dlg.setAttribute('aria-label', 'Zoomed in');
  dlg.innerHTML = `<div class="jbz-stage"><img alt=""></div>
<p class="jbz-hint">Pinch, scroll or double-tap to zoom in. Drag to look around.</p>
<span class="jbz-pct" aria-hidden="true"></span>
<p class="jbz-cap" hidden></p>
<button type="button" class="jbz-x" aria-label="Close zoom">✕</button>
<div class="jbz-strip" hidden></div>
<div class="jbz-bar"><button type="button" data-z="-1" aria-label="Zoom out">−</button><button type="button" data-z="1" aria-label="Zoom in">+</button><button type="button" class="fit" data-z="0">Fit</button></div>`;
  const ready = () => document.body.append(dlg);
  document.body ? ready() : addEventListener('DOMContentLoaded', ready);

  const stage = dlg.querySelector('.jbz-stage'), im = stage.querySelector('img');
  const hint = dlg.querySelector('.jbz-hint'), cap = dlg.querySelector('.jbz-cap'), pct = dlg.querySelector('.jbz-pct'), strip = dlg.querySelector('.jbz-strip');
  let photos = [], idx = 0, W = 1, H = 1, fit = 1, max = 4, s = 1, x = 0, y = 0, pctT = 0;

  const view = () => [stage.clientWidth, stage.clientHeight];
  const clamp = () => {
    const [vw, vh] = view(), iw = W * s, ih = H * s;
    x = iw <= vw ? (vw - iw) / 2 : Math.min(0, Math.max(vw - iw, x));
    y = ih <= vh ? (vh - ih) / 2 : Math.min(0, Math.max(vh - ih, y));
  };
  const paint = (ease) => {
    clamp();
    im.classList.toggle('ease', !!ease);
    im.style.transform = `translate(${x}px,${y}px) scale(${s})`;
    stage.classList.toggle('in', s > fit * 1.05);
    pct.textContent = Math.round((s / fit) * 100) + '%';
    pct.classList.add('on');
    clearTimeout(pctT);
    pctT = setTimeout(() => pct.classList.remove('on'), 900);
  };
  // zoom to scale n, keeping the photo point under screen point (cx, cy) where it is
  const zoomAt = (n, cx, cy, ease) => {
    n = Math.max(fit, Math.min(max, n));
    const px = (cx - x) / s, py = (cy - y) / s;
    s = n; x = cx - px * s; y = cy - py * s;
    paint(ease);
    if (s > fit * 1.05) hint.classList.add('gone');
  };
  const reset = (ease) => {
    const [vw, vh] = view();
    fit = Math.min(vw / W, vh / H) * 0.94;
    // up to 2.5 screen pixels per photo pixel, and never less than 4x the fitted size
    max = Math.max(fit * 4, 2.5);
    s = fit; x = (vw - W * s) / 2; y = (vh - H * s) / 2;
    paint(ease);
  };

  const load = (i, at) => {
    idx = i;
    const ph = photos[i];
    strip.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i));
    im.alt = ph.alt || '';
    cap.textContent = ph.label || '';
    cap.hidden = !ph.label;
    const go = () => {
      W = im.naturalWidth || ph.w || 1000; H = im.naturalHeight || ph.h || 1000;
      im.style.width = W + 'px'; im.style.height = H + 'px';
      reset();
      if (at) { const [vw, vh] = view(); zoomAt(fit * 3, x + at[0] * W * s, y + at[1] * H * s); const dx = vw / 2 - (x + at[0] * W * s), dy = vh / 2 - (y + at[1] * H * s); x += dx; y += dy; paint(); }
    };
    im.onload = go;
    im.src = ph.src;
    if (im.complete && im.naturalWidth) go();
  };

  const open = ({ photos: list, index = 0, at = null }) => {
    photos = list.filter((p) => p && p.src);
    if (!photos.length) return;
    strip.hidden = photos.length < 2;
    strip.innerHTML = photos.map((p, i) => `<button type="button" data-i="${i}" aria-label="Photo ${i + 1}"><img src="${p.thumb || p.src}" alt="" loading="lazy"></button>`).join('');
    hint.classList.remove('gone');
    if (!dlg.open) dlg.showModal();
    load(Math.min(index, photos.length - 1), at);
    setTimeout(() => hint.classList.add('gone'), 4500);
  };
  const close = () => dlg.open && dlg.close();

  dlg.querySelector('.jbz-x').onclick = close;
  strip.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) load(+b.dataset.i); });
  dlg.querySelector('.jbz-bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-z]');
    if (!b) return;
    const [vw, vh] = view();
    if (b.dataset.z === '0') return reset(true);
    zoomAt(s * (b.dataset.z === '1' ? 1.8 : 1 / 1.8), vw / 2, vh / 2, true);
  });
  addEventListener('resize', () => dlg.open && reset());

  // wheel and trackpad pinch (ctrlKey) zoom at the cursor
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
    zoomAt(s * k, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // pointers: one drags, two pinch, a double tap toggles between fitted and close up
  const pts = new Map();
  let pinch = null, lastTap = 0, tapAt = null, moved = 0;
  const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, local(e));
    moved = 0;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
    }
    stage.classList.add('drag');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), cur = local(e);
    pts.set(e.pointerId, cur);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      x += m[0] - pinch.m[0]; y += m[1] - pinch.m[1]; pinch.m = m;  // two fingers also pan
      zoomAt(pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, m[0], m[1]);
      moved = 99;
    } else if (pts.size === 1) {
      x += cur[0] - prev[0]; y += cur[1] - prev[1];
      moved += Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]);
      paint();
    }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId);
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (!pts.size) stage.classList.remove('drag');
    if (e.type !== 'pointerup' || moved > 10 || pts.size) return;
    const now = performance.now();
    if (now - lastTap < 320 && tapAt && Math.hypot(p[0] - tapAt[0], p[1] - tapAt[1]) < 40) {
      lastTap = 0;
      if (s > fit * 1.3) reset(true); else zoomAt(fit * 3, p[0], p[1], true);
    } else { lastTap = now; tapAt = p; }
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => {
    if (!dlg.open) return;
    const [vw, vh] = view();
    if (e.key === '+' || e.key === '=') zoomAt(s * 1.5, vw / 2, vh / 2, true);
    if (e.key === '-') zoomAt(s / 1.5, vw / 2, vh / 2, true);
    if (e.key === '0') reset(true);
    if (photos.length > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) load((idx + (e.key === 'ArrowRight' ? 1 : photos.length - 1)) % photos.length);
  });

  window.JBZoom = { open, close, get isOpen() { return dlg.open; } };
})();
