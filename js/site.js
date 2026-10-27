(() => {
  // "Coming soon" for anything that would buy
  const toast = document.getElementById('toast');
  let t;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(t);
    t = setTimeout(() => toast.classList.remove('show'), 2600);
  };
  document.querySelectorAll('.js-soon').forEach((b) =>
    b.addEventListener('click', () => say('The online shop opens soon. Hang tight.'))
  );

  // Randomized OG-mark watermark across the whole page
  const wm = document.getElementById('wm');
  if (wm) {
    let seed = 1991;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const frag = document.createDocumentFragment();
    const n = 46;
    for (let i = 0; i < n; i++) {
      const big = rnd() < 0.18;
      const img = new Image();
      img.src = 'assets/img/jb-mark.webp';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';
      img.style.left = Math.round(rnd() * 96 - 6) + '%';
      img.style.top = (i / n * 100 + rnd() * 2).toFixed(1) + '%';
      img.style.width = Math.round(big ? 220 + rnd() * 160 : 70 + rnd() * 110) + 'px';
      img.style.opacity = (big ? 0.12 + rnd() * 0.08 : 0.16 + rnd() * 0.12).toFixed(2);
      img.style.transform = 'rotate(' + Math.round(rnd() * 70 - 35) + 'deg)';
      frag.appendChild(img);
    }
    wm.appendChild(frag);
  }

  // Pause animation work in anything that's off screen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('paused', !e.isIntersecting));
    }, { rootMargin: '200px' });
    document.querySelectorAll('.ticker, .hero, .redband, .wall, .strip, .wear, .made, .trip-teaser, .glass').forEach((el) => io.observe(el));
  }
})();
