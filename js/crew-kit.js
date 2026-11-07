/* Crew pages (built by tools/build_crew.py): the "Take <name> with you" share kit and the
   "Where <name> came from" slides.

   Share: phones get the native share sheet with the MP4 as a file (Instagram, TikTok and Facebook only show up
   for video). The MP4 is fetched ahead of time, when the kit scrolls near, because iOS Safari only allows
   navigator.share() while the tap is still "fresh"; awaiting a download inside the click is what made the old
   GIF share flaky. Desktop, or a phone that can't share files: download the MP4 and copy the page link. */
(() => {
  const kit = document.getElementById('kit');
  const btn = document.getElementById('kitShare');
  const note = document.getElementById('gifNote');
  const say = (t) => { if (note) note.textContent = t; };

  if (kit && btn) {
    const url = new URL(btn.dataset.mp4, location.href).href;
    const name = btn.dataset.name;
    const touch = matchMedia('(pointer: coarse)').matches;
    let file = null, loading = null;
    const load = () => loading || (loading = fetch(url).then((r) => {
      if (!r.ok) throw new Error('video ' + r.status);
      return r.blob();
    }).then((b) => (file = new File([b], name, { type: 'video/mp4' }))).catch((err) => { loading = null; throw err; }));
    // only phones share the file, so only phones prefetch it
    const canFiles = () => !!(navigator.canShare && navigator.share);
    if (touch && canFiles()) {
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); load().catch(() => {}); } }, { rootMargin: '800px 0px' });
        io.observe(kit);
      } else load().catch(() => {});
    }
    const download = () => {
      const a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    };
    const copyLink = async () => {
      try { await navigator.clipboard.writeText(location.origin + location.pathname); return true; } catch (e) { return false; }
    };
    const fallback = async (why) => {
      download();
      const copied = await copyLink();
      say((why ? why + ' ' : '') + 'Downloading the video. To post it, open Instagram or TikTok, tap +, and pick it from your files or camera roll.'
        + (copied ? ' Page link copied too.' : ''));
    };
    btn.addEventListener('click', async () => {
      say('');
      if (!(touch && canFiles())) { await fallback(''); return; }
      if (!file) {
        say('Getting the video ready…');
        try { await load(); } catch (e) { await fallback('Could not load the video for sharing.'); return; }
        // after waiting on the network, iOS no longer counts this as the tap; one more tap shares it
        say('Video ready. Tap Share again.');
        return;
      }
      if (!navigator.canShare({ files: [file] })) { await fallback('This browser cannot share video files.'); return; }
      try {
        await navigator.share({ files: [file] });
        say('');
      } catch (e) {
        if (e && e.name === 'AbortError') return; // closed the share sheet
        if (e && e.name === 'NotAllowedError') { say('Tap Share again.'); return; }
        await fallback('Sharing did not work here.');
      }
    });
  }

  // where they come from: show the whole piece, then zoom into the spot (tools/build_crew.py origin_block)
  const frame = document.getElementById('ogFrame');
  if (frame) {
    const stage = document.getElementById('ogStage');
    const tog = document.getElementById('ogTog');
    const img = stage.querySelector('img');
    const [sx, sy, sw, sh] = frame.dataset.spot.split(',').map(Number);
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    let zoomed = false, started = false;
    // whole piece: centred, contained. zoomed: the spot fills about two thirds of the frame, never past the art's edges
    const place = () => {
      const F = frame.getBoundingClientRect(), fw = frame.clientWidth, fh = frame.clientHeight;
      const W = stage.offsetWidth, H = stage.offsetHeight;
      if (!W || !H || !F.width) return;
      let s = 1, tx = (fw - W) / 2, ty = (fh - H) / 2;
      if (zoomed) {
        const pw = W * sw / 100, ph = H * sh / 100;
        // never blow the art up much past its own pixels, or it goes to mush
        const sharp = Math.max(2.5, 1.6 * (img.naturalWidth || W) / W);
        s = Math.max(1, Math.min(9, sharp, 0.66 * fw / pw, 0.66 * fh / ph));
        const cx = W * (sx + sw / 2) / 100, cy = H * (sy + sh / 2) / 100;
        tx = fw / 2 - cx * s; ty = fh / 2 - cy * s;
        tx = W * s <= fw ? (fw - W * s) / 2 : Math.min(0, Math.max(fw - W * s, tx));
        ty = H * s <= fh ? (fh - H * s) / 2 : Math.min(0, Math.max(fh - H * s, ty));
      }
      stage.style.setProperty('--s', s.toFixed(3));
      stage.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
      frame.classList.toggle('zoomed', zoomed);
      tog.setAttribute('aria-pressed', zoomed ? 'true' : 'false');
      tog.textContent = zoomed ? tog.dataset.out : tog.dataset.in;
    };
    const set = (z) => { zoomed = z; place(); };
    tog.addEventListener('click', () => { started = true; set(!zoomed); });
    frame.addEventListener('click', () => { started = true; set(!zoomed); });
    addEventListener('resize', place, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(place).observe(frame);
    // start on the whole thing; once it is on screen and loaded, hold a beat, then zoom in
    const go = () => {
      if (started) return;
      started = true;
      if (still.matches) { set(true); return; }
      setTimeout(() => set(true), 1100);
    };
    const ready = () => img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
    place();
    requestAnimationFrame(() => requestAnimationFrame(() => frame.classList.add('ready')));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (es.some((x) => x.isIntersecting)) { io.disconnect(); ready().then(go); }
      }, { threshold: 0.45 });
      io.observe(frame);
    } else ready().then(go);
  }

})();
