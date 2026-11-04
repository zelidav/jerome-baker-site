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
    'comics/': 'The Hot Shop', '#made': 'The Story', 'travel/': 'Travel Guide', 'wholesale/': 'Wholesale', 'join/': 'Join the JB Fam' };
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
      // built on a power-of-two grid (so every midpoint has both neighbors), then sampled at the N steps
      const M = 1024, g = new Array(M + 1);
      g[0] = (rnd() - .5) * amp; g[M] = (rnd() - .5) * amp;
      for (let step = M, a = amp; step > 1; step /= 2, a *= rough) {
        const h = step / 2;
        for (let i = h; i < M; i += step) g[i] = (g[i - h] + g[i + h]) / 2 + (rnd() - .5) * a;
      }
      return Array.from({ length: N + 1 }, (_, i) => { const x = i * M / N, k = Math.floor(x), f = x - k; return g[k] + ((g[Math.min(M, k + 1)] - g[k]) * f); });
    };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    // each layer tears on its own: its own rolling swells, its own mid-size jags, its own sharp teeth. The swells
    // and jags are seeded by the page (stable per page, different across pages); the finest teeth shift a little
    // on every visit.
    const tearLine = (mid, swellAmp, jagAmp, teeth) => {
      const waves = [[520, 900, 1], [180, 320, .56], [60, 120, .28]].map(([lo, hi, k]) => [lo + rnd() * (hi - lo), rnd() * 6.28, swellAmp * k * (.7 + rnd() * .6)]);
      const jag = fractal(jagAmp, .55);
      return Array.from({ length: N + 1 }, (_, i) => mid + jag[i]
        + waves.reduce((y, [per, ph, amp]) => y + amp * Math.sin((i * W / N) / per * 6.28 + ph), 0)
        + (Math.random() - .5) * teeth);
    };
    // the white paper underneath, torn at the bottom
    const paper = tearLine(H * .64, 6, 9, 3.2).map((y) => clamp(y, 14, H - 4));
    // the blue print on top, torn its own way, always leaving at least a sliver of the white showing
    const ink = tearLine(H * .3, 5, 8, 2.6).map((y, i) => clamp(y, 2, paper[i] - 2.5));
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
    // a soft shadow under the paper (the halftone dot filter broke into dotted lines along a thin edge)
    edge.style.filter = 'drop-shadow(0 3px 2px rgba(10,10,10,.35))';
  };
  tear(head, 'menu');
  // a bar of links right under the menu (the shop's yellow categories) is the next layer down, torn its own way
  const under = head.nextElementSibling;
  if (under && under.matches('.subnav')) { under.classList.add('hdr-under'); tear(under, 'under'); }

  // ---------- links to a spot on the page land below whatever sticks to the top ----------
  // (the menu, the shop's yellow bar and its tear, the glass filter bar), so the section and its items show
  const stick = () => {
    let h = 0;
    for (const el of document.querySelectorAll('header.top, header.topbar, .subnav, .sbar')) {
      const cs = getComputedStyle(el);
      if ((cs.position !== 'sticky' && cs.position !== 'fixed') || cs.display === 'none') continue;
      const rip = el.querySelector(':scope > .hdr-tear');
      h = Math.max(h, (parseFloat(cs.top) || 0) + el.offsetHeight + (rip ? rip.offsetHeight * .7 : 0));
    }
    document.documentElement.style.setProperty('--stick', Math.round(h + 14) + 'px');
  };
  const stickCss = document.createElement('style');
  stickCss.textContent = '[id]{scroll-margin-top:var(--stick,110px)}';
  document.head.append(stickCss);
  stick();
  addEventListener('resize', stick);
  addEventListener('load', stick);

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
