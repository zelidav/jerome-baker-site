/* The giant hand-off. The first time a dancing giant (Baker, Mellow Yellow, Agent Orange) is opened on the bench,
   its spot starts empty: she waltzes in from the side carrying it, sets it down exactly where the piece sits, the
   real photo takes over, and she lets go and dances off. Then the bench is yours (hold to take a hit, zoom).
   Assets per giant (assets/dance/): <file>-in.webp (her + the giant, plays once, ends on the hand-off frame) and
   <file>-out.webp (her alone from that frame on, plays once). Animated WebP keeps its transparency in every browser.
   While she is on, <html data-dancing="1"> is set and `jb:dance` fires {state:'start'|'done'}, so crew antics can
   wait. Never leaves the bench empty: reduced motion, data saver, weak devices, ?dance=0 or anything failing to load
   within 4 s shows the piece straight away. She never blocks a tap. */
(() => {
  // piece id -> its loops and the giant's box at the hand-off frame, in sprite pixels (made by jbsite-work/dance/v2/pack.py)
  const DANCERS = {
    'JBD-595E91DF67DE': { file: 'baker', w: 356, h: 480, giant: [75, 49, 239, 460], in: 2.542, out: 3.542, exit: 'right' },
    'JBD-5261B7223810': { file: 'yellow', w: 484, h: 480, giant: [172, 22, 361, 463], in: 3.375, out: 2.708, exit: 'right' },
    'JBD-7F9BF1B7B45F': { file: 'orange', w: 384, h: 480, giant: [119, 78, 262, 458], in: 3.167, out: 2.917, exit: 'right' },
  };
  const root = document.documentElement;
  const q = new URLSearchParams(location.search);
  try { if (q.has('dance')) sessionStorage.setItem('jb-dance', q.get('dance')); } catch (e) { /* storage blocked */ }
  let off = false;
  try { off = sessionStorage.getItem('jb-dance') === '0'; } catch (e) { /* storage blocked */ }
  const ua = navigator.userAgent;
  // iOS reports a low core count for privacy, so it must not count as a weak device
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const weak = (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 3) || (!ios && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  const bench = document.getElementById('bench');
  if (off || weak || !bench || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dir = (root.dataset.base || '../') + 'assets/dance/';
  const css = document.createElement('style');
  css.textContent = `
.bench.jb-wait #bImg{opacity:0;transition:none}
.bench #bImg{transition:opacity .3s ease}
.bench.jb-wait #bHit,.bench.jb-wait #bZoom{opacity:0;pointer-events:none}
.bench #bHit,.bench #bZoom{transition:opacity .4s ease .2s}
.bench.jb-wait #bPiece::after{content:"";position:absolute;inset:auto 10% -2% 10%;height:14%;border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,255,255,.55),rgba(255,255,255,0));pointer-events:none;animation:jb-spot 1.6s ease-in-out infinite alternate}
@keyframes jb-spot{from{opacity:.45}to{opacity:.9}}
.jb-dancer{position:fixed;left:0;top:0;z-index:50;pointer-events:none;transform-origin:0 0;will-change:transform,opacity;
  -webkit-touch-callout:none;user-select:none;-webkit-user-select:none;filter:drop-shadow(0 14px 16px rgba(10,10,10,.3))}
.jb-dancer img{position:absolute;inset:0;width:100%;height:100%;display:block}`;
  document.head.append(css);

  // fetch once into a blob, then hand out a fresh object URL per use: each <img> then starts its animation from frame
  // one (same-URL animated images share one timeline in some browsers) without downloading it again
  const blobs = {};
  const blobOf = (url) => (blobs[url] = blobs[url] || fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }));
  const load = async (url) => {
    const img = new Image();
    img.alt = '';
    img.src = URL.createObjectURL(await blobOf(url));
    await img.decode();
    return img;
  };
  const done = new Set();
  try { (sessionStorage.getItem('jb-danced') || '').split(',').filter(Boolean).forEach((x) => done.add(x)); } catch (e) { /* storage blocked */ }
  let live = null;

  const reveal = () => bench.classList.remove('jb-wait');
  const signal = (state) => {
    // after she leaves, the piece gets a few quiet seconds on its own before any crew antics start
    clearTimeout(signal.t);
    if (state === 'start') root.dataset.dancing = '1'; else signal.t = setTimeout(() => delete root.dataset.dancing, 3000);
    document.dispatchEvent(new CustomEvent('jb:dance', { detail: { state } }));
  };

  const handoff = async (id) => {
    const d = DANCERS[id];
    if (!d || !d.w || done.has(id) || live) return;
    done.add(id);
    try { sessionStorage.setItem('jb-danced', [...done].join(',')); } catch (e) { /* storage blocked */ }
    const run = live = { id, el: null, stop: false };
    bench.classList.add('jb-wait');
    signal('start');
    const finish = () => {
      if (run.el) run.el.remove();
      document.removeEventListener('pointerdown', tap, true);
      reveal();
      if (live === run) { live = null; signal('done'); }
    };
    const tap = (e) => {
      if (!run.el) return;
      const r = run.el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { run.stop = true; finish(); }
    };
    // never leave the spot empty: whatever is not ready in 4 s, show the piece
    const safety = setTimeout(() => { if (!run.el) { run.stop = true; finish(); } }, 4000);
    let inImg, outImg;
    const bImg = document.getElementById('bImg');
    try {
      [inImg, outImg] = await Promise.all([load(dir + d.file + '-in.webp'), load(dir + d.file + '-out.webp'),
        bImg.complete && bImg.naturalWidth ? null : bImg.decode()]);
    } catch (e) { run.stop = true; }
    clearTimeout(safety);
    if (run.stop || live !== run || !bench.open) return finish();

    // place her so the giant in her arms lands exactly on the piece: same height, same center line, same base
    const r = bImg.getBoundingClientRect();
    const [gx0, gy0, gx1, gy1] = d.giant;
    const s = r.height / (gy1 - gy0);
    const x = r.left + r.width / 2 - ((gx0 + gx1) / 2) * s;
    const y = r.bottom - gy1 * s;
    const el = run.el = document.createElement('div');
    el.className = 'jb-dancer';
    el.setAttribute('aria-hidden', 'true');
    el.style.width = d.w + 'px';
    el.style.height = d.h + 'px';
    el.append(inImg);
    bench.append(el);
    document.addEventListener('pointerdown', tap, true);
    const at = (dx) => `translate(${x + dx}px, ${y}px) scale(${s})`;
    const W = innerWidth, from = -(r.left + r.width / 2 + d.w * s * 0.6);
    // in: from off the left edge, decelerating into the spot as the clip reaches the hand-off frame
    const a1 = el.animate([{ transform: at(from), opacity: 0 }, { opacity: 1, offset: 0.12 }, { transform: at(0), opacity: 1 }],
      { duration: d.in * 1000, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'forwards' });
    await a1.finished.catch(() => {});
    if (run.stop || live !== run) return;
    // the hand-off: the real piece fades in under the giant in her arms, and her copy of it is gone
    // (a short crossfade, so the spot is never empty for a frame)
    el.insertBefore(outImg, inImg);
    reveal();
    inImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(() => inImg.remove(), () => inImg.remove());
    // out: she lets go and dances off on her own side, so she never walks back through it
    const to = d.exit === 'left' ? -(x + d.w * s) : W - x + 20;
    const a2 = el.animate([{ transform: at(0), opacity: 1 }, { opacity: 1, offset: 0.75 }, { transform: at(to), opacity: 0 }],
      { duration: d.out * 1000, easing: 'cubic-bezier(.45,0,.75,.9)', fill: 'forwards' });
    await a2.finished.catch(() => {});
    if (!run.stop) finish();
  };

  const current = () => { const m = location.hash.match(/^#p=(JBD-[A-F0-9]+)$/); return m && DANCERS[m[1]] ? m[1] : null; };
  const check = () => {
    const id = current();
    if (live && (!bench.open || live.id !== id)) { live.stop = true; if (live.el) live.el.remove(); reveal(); live = null; signal('done'); }
    if (bench.open && id) handoff(id);
  };
  new MutationObserver(check).observe(bench, { attributes: true, attributeFilter: ['open'] });
  // switching pieces inside the bench changes the fragment with replaceState, which fires no event: check on clicks
  bench.addEventListener('click', () => setTimeout(check, 60));
  addEventListener('hashchange', () => setTimeout(check, 60));
  // a link straight to a giant opens the bench before this script runs
  check();
  addEventListener('load', () => setTimeout(check, 300));
})();
