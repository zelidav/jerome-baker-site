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
  const W = 1200, H = 30;
  const tear = (depth, step) => {
    // a ragged line along the bottom: big lazy dips with small sharp teeth on top
    let d = `M0 0 H${W} V${(H * .35).toFixed(1)}`;
    const phase = rnd() * 6.28, lazy = 2 + rnd() * 3;
    for (let x = W; x > 0; x -= step * (.5 + rnd())) {
      const swell = (Math.sin(x / W * Math.PI * lazy + phase) + 1) / 2;
      const y = H * (.12 + .6 * swell * depth + rnd() * .35 * depth);
      d += ` L${x.toFixed(1)} ${Math.min(H, y).toFixed(1)}`;
    }
    return d + ` L0 ${(H * .3).toFixed(1)} Z`;
  };
  const bg = getComputedStyle(head).backgroundColor || '#2A3B8E';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
    `<path d="${tear(1, 14)}" fill="#F4EFE4"/>` +           // the paper fibres show past the blue
    `<path d="${tear(.75, 10)}" fill="${bg}"/></svg>`;
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
