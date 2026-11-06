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

  // the slides
  const track = document.getElementById('ogTrack');
  if (track) {
    const slides = [...track.querySelectorAll('.og-slide')];
    const dots = [...document.querySelectorAll('.og-dot')];
    const prev = document.getElementById('ogPrev'), next = document.getElementById('ogNext');
    const live = document.getElementById('ogLive');
    let cur = 0;
    const mark = (i) => {
      if (i === cur && slides[i].classList.contains('on')) return;
      cur = i;
      slides.forEach((s, k) => { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
      prev.disabled = i === 0; next.disabled = i === slides.length - 1;
      if (live) live.textContent = 'Slide ' + (i + 1) + ' of ' + slides.length;
    };
    const go = (i) => {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      mark(i);
    };
    prev.addEventListener('click', () => go(cur - 1));
    next.addEventListener('click', () => go(cur + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    track.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight') { ev.preventDefault(); go(cur + 1); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(cur - 1); }
      else if (ev.key === 'Home') { ev.preventDefault(); go(0); }
      else if (ev.key === 'End') { ev.preventDefault(); go(slides.length - 1); }
    });
    // swiping: follow the scroll position
    let t = 0;
    track.addEventListener('scroll', () => {
      clearTimeout(t);
      t = setTimeout(() => mark(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))), 80);
    }, { passive: true });
    mark(0);
  }

})();
