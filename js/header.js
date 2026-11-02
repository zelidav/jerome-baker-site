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

  // ---------- the torn edge, one per page ----------
  // a small seeded random, so the same page always tears the same way and every page tears differently
  let seed = 2166136261;
  for (const ch of location.pathname.replace(/index\.html$/, '')) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { seed = Math.imul(seed ^ (seed >>> 15), 2246822507); seed = Math.imul(seed ^ (seed >>> 13), 3266489909); return ((seed ^= seed >>> 16) >>> 0) / 4294967296; };
  // drawn at real pixel size (never stretched, css/header.css sizes it), wide enough for big screens
  const W = 3000, H = 48, N = 512; // N segments, ~6px apart (bigger, chunkier tears)
  // midpoint displacement: big wandering rips with smaller and smaller jags on top, like real torn paper
  const fractal = (amp, rough) => {
    const ys = new Array(N + 1);
    ys[0] = (rnd() - .5) * amp; ys[N] = (rnd() - .5) * amp;
    for (let step = N, a = amp; step > 1; step >>= 1, a *= rough) {
      for (let i = step >> 1; i < N; i += step) ys[i] = (ys[i - (step >> 1)] + ys[i + (step >> 1)]) / 2 + (rnd() - .5) * a;
    }
    return ys;
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // the white paper core: the deepest line
  const rip = fractal(44, .56);
  const paper = rip.map((v) => clamp(H * .58 + v, 12, H - 9)); // leaves room under the deepest rip for the fuzz
  // the blue layer tears shy of it: a wide white lip that now and then opens into a bigger flap
  const lipNoise = fractal(20, .6);
  const blue = paper.map((y, i) => clamp(y - (4 + Math.max(0, lipNoise[i]) * 1.2 + Math.abs(lipNoise[i]) * .35), 4, y - 3));
  const line = (ys, dy = 0) => {
    let d = `M0 -4 H${W}`;
    for (let i = N; i >= 0; i--) d += ` L${(i * W / N).toFixed(1)} ${(ys[i] + dy).toFixed(1)}`;
    return d + ' Z';
  };
  const bg = getComputedStyle(head).backgroundColor || '#2A3B8E';
  const tseed = Math.floor(rnd() * 999);
  const top = Math.min(...blue) - 2;
  // the fuzz: loose paper fibres hanging off the rip. Clumpy on purpose: bare stretches, then a tuft, then a few strays,
  // with lengths, angles, curl and thickness all random (and seeded, so each page keeps its own fuzz)
  const yAt = (x) => { const f = clamp(x / W * N, 0, N), i = Math.min(N - 1, Math.floor(f)); return paper[i] + (paper[i + 1] - paper[i]) * (f - i); };
  let fibres = '';
  for (let x = rnd() * 30; x < W; x += 4 + Math.pow(rnd(), 1.8) * 70) {
    const tuft = rnd() < .3 ? 0 : 1 + Math.floor(rnd() * rnd() * 9); // often a few, sometimes a big tuft, sometimes none
    const spread = 3 + rnd() * 16;
    for (let k = 0; k < tuft; k++) {
      const fx = x + (rnd() - .5) * spread, y0 = yAt(fx) - 1.5;
      const len = 3 + Math.pow(rnd(), 1.6) * 11;                 // 3px to 14px, mostly mid-length, the odd long one
      const ang = (rnd() - .5) * 2.2;                            // anywhere from leaning hard left to hard right
      const ex = fx + Math.sin(ang) * len, ey = Math.min(H - 1, y0 + Math.cos(ang) * len);
      const curl = (rnd() - .5) * len * .9;                      // some straight, some hooked
      const cx = (fx + ex) / 2 + curl, cy = (y0 + ey) / 2 + Math.abs(curl) * .3;
      const w = (.7 + Math.pow(rnd(), 2) * 1.6).toFixed(2);      // thin hairs with a few thick strands
      const c = rnd() < .22 ? '#CFC6B4' : '#F7F2E8';
      fibres += `<path d="M${fx.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${c}" stroke-width="${w}"/>`;
    }
  }
  // a different noise grain per page, so the edge roughness itself is uneven too
  const fq = (a, b) => (a + rnd() * (b - a)).toFixed(3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    // fibres: layered noise (coarse + fine octaves) pushes the edges around so they fuzz in uneven patches instead of cutting clean
    `<filter id="fz" x="-1%" y="-30%" width="102%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="${fq(.12, .22)} ${fq(.25, .45)}" numOctaves="4" seed="${tseed}"/><feDisplacementMap in="SourceGraphic" scale="${fq(3.5, 5)}" xChannelSelector="R" yChannelSelector="G"/></filter>` +
    `<filter id="fb" x="-1%" y="-30%" width="102%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="${fq(.15, .3)} ${fq(.3, .5)}" numOctaves="3" seed="${tseed + 7}"/><feDisplacementMap in="SourceGraphic" scale="${fq(2, 3)}" xChannelSelector="R" yChannelSelector="G"/></filter>` +
    `</defs>` +
    `<g fill="none" stroke-linecap="round" filter="url(#fb)">${fibres}</g>` + // the loose fibres, tucked under the paper
    `<path d="${line(paper, 1.2)}" fill="#CFC6B4" filter="url(#fz)"/>` +   // paper thickness, a hair darker underneath
    `<path d="${line(paper)}" fill="#F7F2E8" filter="url(#fz)"/>` +        // the white core of the torn paper
    `<path d="${line(blue)}" fill="${bg}" filter="url(#fb)"/>` +           // the blue print layer, torn short
    `<rect x="0" y="-4" width="${W}" height="${(top + 4).toFixed(1)}" fill="${bg}"/></svg>`;
  const edge = document.createElement('div');
  edge.className = 'hdr-tear';
  edge.setAttribute('aria-hidden', 'true');
  edge.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  head.append(edge);

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
    logo.addEventListener('pointerenter', spin);
    logo.addEventListener('touchstart', spin, { passive: true });
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
      if (a._g) return;
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
