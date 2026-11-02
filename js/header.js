/* The header, everywhere (css/header.css; loaded by js/dock.js so no page needs rebuilding):
   1. the nav links genie out of the logo on load (squeezed through a funnel, then they pop open), and do a little
      genie wobble on hover
   2. the JB logo floats, wobbles and catches a glint now and then; hover or tap and it does a jelly spin
   3. the bottom edge of the header is torn paper, and the tear is different on every page (seeded by the URL) */
(() => {
  const head = document.querySelector('header.top, header.topbar');
  if (!head || head.dataset.hdr) return;
  head.dataset.hdr = '1';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  head.classList.add('hdr');

  // ---------- one menu, every page ----------
  // the crew pages are built by a script, so their menu labels are brought in line here:
  // same words as the home, shop, glass and comics menus, and the page you're on lights up
  const LABEL = { 'glass/': 'Glass', 'shop/': 'Ritual Merch', 'crew/': 'The JB Crew', 'crew/match/': 'Find Your Crew',
    'comics/': 'The Hot Shop', '#made': 'The Story', 'travel/': 'Travel Guide' };
  const page = location.pathname.replace(/index\.html$/, '');
  head.querySelectorAll('nav[aria-label="Main"] a:not(.btn):not(.cartbtn)').forEach((a) => {
    const key = Object.keys(LABEL).find((k) => (a.getAttribute('href') || '').replace(/^(\.\.\/)+/, '') === k);
    if (!key) return;
    if (a.textContent.trim().toLowerCase() === LABEL[key].toLowerCase()) a.textContent = LABEL[key];
    if (key !== '#made' && !a.hasAttribute('aria-current') && new URL(a.href, location.href).pathname === page) a.setAttribute('aria-current', 'page');
  });
  // the shared footer is built by the same script, so its links get the same words
  document.querySelectorAll('footer.site-foot a').forEach((a) => {
    const key = Object.keys(LABEL).find((k) => (a.getAttribute('href') || '').replace(/^(\.\.\/)+/, '') === k);
    if (key && a.textContent.trim().toLowerCase() === LABEL[key].toLowerCase()) a.textContent = LABEL[key];
  });

  // ---------- the torn edges, one per page ----------
  // Sasha's brief: torn paper under the blue menu, and under the yellow bar when a page has one (the shop), each
  // different, each page different. Like his reference: a rolling rip with small sharp jags, a white paper band of
  // varying thickness showing past the print, and a soft shadow on whatever's below. The yellow bar sits under the
  // blue one, so the two read as layers of paper.
  const W = 3000, H = 40, N = 600; // drawn at real pixel size, 5px per step, wide enough for big screens
  const tearSvg = (salt, color) => {
    // a small seeded random: the same page always tears the same way, every page and every layer differently
    let seed = 2166136261;
    for (const ch of location.pathname.replace(/index\.html$/, '') + '|' + salt) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
    const rnd = () => { seed = Math.imul(seed ^ (seed >>> 15), 2246822507); seed = Math.imul(seed ^ (seed >>> 13), 3266489909); return ((seed ^= seed >>> 16) >>> 0) / 4294967296; };
    // midpoint displacement: long rolling swells, smaller jags riding on them
    const fractal = (amp, rough) => {
      const ys = new Array(N + 1);
      ys[0] = (rnd() - .5) * amp; ys[N] = (rnd() - .5) * amp;
      for (let step = N, a = amp; step > 1; step = Math.floor(step / 2), a *= rough) {
        const h = Math.floor(step / 2);
        for (let i = h; i < N; i += step) if (ys[i] === undefined) ys[i] = (ys[i - h] + ys[Math.min(N, i + h)]) / 2 + (rnd() - .5) * a;
      }
      for (let i = 0; i <= N; i++) if (ys[i] === undefined) ys[i] = ys[i - 1];
      return ys;
    };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const waves = [[520, 900, 8], [180, 320, 4.5], [60, 120, 2.2]].map(([a, b, amp]) => [a + rnd() * (b - a), rnd() * 6.28, amp * (.7 + rnd() * .6)]);
    const swell = Array.from({ length: N + 1 }, (_, i) => waves.reduce((y, [per, ph, amp]) => y + amp * Math.sin((i * W / N) / per * 6.28 + ph), 0));
    // the bottom of the paper: the swell plus fine, sharp teeth
    const paper = swell.map((v) => clamp(H * .55 + v + (rnd() - .5) * 4.5, 12, H - 6));
    // the white band: thin in places, fat in others, changing slowly
    const band = fractal(16, .5);
    const ink = paper.map((y, i) => clamp(y - (5 + Math.abs(band[i]) * 1.1) + (rnd() - .5) * 3, 2, y - 3));
    const line = (ys) => {
      let d = `M0 -2 H${W}`;
      for (let i = N; i >= 0; i--) d += ` L${(i * W / N).toFixed(1)} ${ys[i].toFixed(1)}`;
      return d + ' Z';
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<path d="${line(paper)}" fill="#FFFFFF"/>` +                     // the white paper
      `<path d="${line(paper.map((y) => y - .8))}" fill="#E9E6DF"/>` +   // a hair of shade on the paper's torn lip
      `<path d="${line(paper.map((y) => y - 1.6))}" fill="#FFFFFF"/>` +
      `<path d="${line(ink)}" fill="${color}"/></svg>`;               // the printed color, torn short of it
  };
  const tear = (el, salt) => {
    const edge = document.createElement('div');
    edge.className = 'hdr-tear';
    edge.setAttribute('aria-hidden', 'true');
    const color = getComputedStyle(el).backgroundColor || '#2A3B8E';
    edge.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(tearSvg(salt, color))}")`;
    el.append(edge);
    // halftone dot shadow under the paper (js/popfx.js makes the filter), like the rest of the page
    const dots = () => { if (window.JBHalftone) edge.style.filter = `url(#${window.JBHalftone(0, 6)})`; };
    window.JBHalftone ? dots() : addEventListener('load', () => setTimeout(dots, 80));
  };
  tear(head, 'menu');
  // a bar of links right under the menu (the shop's yellow categories) is the next layer down, torn its own way
  const under = head.nextElementSibling;
  if (under && under.matches('.subnav')) { under.classList.add('hdr-under'); tear(under, 'under'); }

  // ---------- the logo ----------
  const logo = head.querySelector('a.logo, :scope > a:first-child');
  const img = logo && logo.querySelector('img');
  if (logo && img) {
    logo.classList.add('hdr-logo');
    logo.style.setProperty('--mark', `url("${img.currentSrc || img.src}")`);
    const spin = () => {
      if (reduce || logo.classList.contains('jelly')) return;
      logo.classList.add('jelly');
      setTimeout(() => logo.classList.remove('jelly'), 900);
    };
    logo.addEventListener('touchstart', spin, { passive: true });
    // the other logo: the crossed-bongs Jerome Baker script (assets/img/jb-crossed.svg, from the NY site).
    // Hover and it flips over to it; now and then it flips by itself, then back.
    const alt = new Image();
    alt.src = (img.currentSrc || img.src).replace(/jb-mark\.webp.*$/, 'jb-crossed.svg');
    alt.alt = '';
    alt.className = 'hdr-alt';
    alt.setAttribute('aria-hidden', 'true');
    logo.append(alt);
    let back = 0;
    const flip = (ms) => {
      if (reduce) return;
      clearTimeout(back);
      logo.classList.add('alt');
      if (ms) back = setTimeout(() => logo.classList.remove('alt'), ms);
    };
    logo.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') flip(0); else spin(); });
    logo.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { clearTimeout(back); back = setTimeout(() => logo.classList.remove('alt'), 350); } });
    const now = () => {
      setTimeout(() => { if (!document.hidden && !logo.matches(':hover')) flip(2600); now(); }, 9000 + Math.random() * 14000);
    };
    now();
  }

  // ---------- the links ----------
  const links = [...head.querySelectorAll('nav a')].filter((a) => !a.classList.contains('btn') && !a.classList.contains('cartbtn'));
  if (reduce || !links.length) return;
  const from = img ? img.getBoundingClientRect() : head.getBoundingClientRect();
  const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
  links.forEach((a, i) => {
    a.classList.add('genie');
    const r = a.getBoundingClientRect();
    if (!r.width) return; // hidden on phones (the dock has them)
    // pour out of the logo: start squeezed at the lamp, then stretch and land
    const dx = fx - (r.left + r.width / 2), dy = fy - (r.top + r.height / 2);
    a.animate([
      { transform: `translate(${dx}px,${dy}px) scale(.08,.3) skewX(-30deg)`, clipPath: 'polygon(42% 0,58% 0,100% 100%,0 100%)', opacity: 0 },
      { transform: `translate(${dx * .45}px,${dy * .45}px) scale(.45,1.35) skewX(14deg)`, clipPath: 'polygon(20% 0,80% 0,100% 100%,0 100%)', opacity: 1, offset: .55 },
      { transform: 'translate(0,0) scale(1.08,.9) skewX(-4deg)', clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)', offset: .85 },
      { transform: 'none', clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)', opacity: 1 },
    ], { duration: 720, delay: 120 + i * 85, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'backwards' });
    a.addEventListener('pointerenter', () => {
      if (a._g || a.closest('nav.lens')) return; // the magnifying glass (js/dock.js) owns hover on desktop
      a._g = a.animate([
        { transform: 'none', clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' },
        { transform: 'scale(.9,1.18) skewX(8deg)', clipPath: 'polygon(14% 0,86% 0,100% 100%,0 100%)', offset: .35 },
        { transform: 'scale(1.06,.94) skewX(-3deg)', clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)', offset: .7 },
        { transform: 'none', clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' },
      ], { duration: 460, easing: 'ease-out' });
      a._g.finished.then(() => { a._g = null; }, () => { a._g = null; });
    });
  });
})();
