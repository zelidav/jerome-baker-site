/* Featured, rotating: a strip on the home page that mixes the glass (our one-of-ones and the jeromebaker.com studio
   store pieces) with the merch (Ritual Merch and the jeromebaker.com merch). It drifts one card every few seconds,
   swipes, and stops while someone is touching, hovering or focused on it, when it's off screen, or with reduced
   motion. The two catalogs (js/glass-data.js, js/shop-data.js) only load when the strip gets near the screen. */
(() => {
  const anchor = document.getElementById('glass');
  if (!anchor || document.getElementById('featured-strip')) return;
  const base = document.documentElement.dataset.base || '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => '$' + (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const css = document.createElement('style');
  css.textContent = `
.fx-sec{background:#FFF100;border-top:4px solid #0A0A0A;border-bottom:4px solid #0A0A0A;padding-top:48px;padding-bottom:40px;overflow:hidden}
.fx-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;max-width:1344px;margin:0 auto 18px}
.fx-head h2{margin:0;font:900 clamp(34px,6vw,64px)/.95 Montserrat,Helvetica,Arial,sans-serif;color:#0A0A0A;letter-spacing:-.02em}
.fx-head p{margin:6px 0 0;font:600 15px/1.4 Montserrat,Helvetica,Arial,sans-serif;color:#0A0A0A;max-width:46ch}
.fx-btns{display:flex;gap:10px}
.fx-btns button{width:48px;height:48px;border:3px solid #0A0A0A;background:#fff;color:#0A0A0A;font:900 22px/1 Montserrat,Helvetica,Arial,sans-serif;cursor:pointer;box-shadow:4px 4px 0 #0A0A0A}
.fx-track{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 16px;padding:8px 16px 22px;margin:0 -16px;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.fx-track::-webkit-scrollbar{display:none}
.fx-card{flex:0 0 clamp(200px,24vw,280px);scroll-snap-align:start;display:flex;flex-direction:column;background:#fff;border:3px solid #0A0A0A;color:#0A0A0A;text-decoration:none;box-shadow:6px 6px 0 #0A0A0A;rotate:var(--t,0deg);transition:rotate .25s,translate .25s}
.fx-card:hover,.fx-card:focus-visible{rotate:0deg;translate:0 -4px}
.fx-pic{position:relative;aspect-ratio:4/5;display:flex;align-items:flex-end;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#fff 0,#eef0f6 60%,#dfe2ec 100%);border-bottom:3px solid #0A0A0A;overflow:hidden}
.fx-pic img{max-height:88%;max-width:84%;width:auto;height:auto;margin-bottom:6%;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(20,24,60,.18))}
.fx-card.merch .fx-pic img{max-height:100%;max-width:100%;margin:0;width:100%;height:100%;object-fit:cover;filter:none}
.fx-tag{position:absolute;left:10px;top:10px;z-index:1;padding:4px 8px;background:#0A0A0A;color:#FFF100;font:800 11px/1 "JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase}
.fx-meta{padding:12px 14px 14px}
.fx-meta b{display:block;font:800 16px/1.2 Montserrat,Helvetica,Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fx-meta span{display:block;margin-top:2px;font:500 13px/1.3 Montserrat,Helvetica,Arial,sans-serif;color:#4a4f60}
.fx-meta i{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;font:900 18px/1 Montserrat,Helvetica,Arial,sans-serif;font-style:normal;color:#2A3B8E}
.fx-meta i small{font:800 11px "JetBrains Mono",monospace;letter-spacing:.1em;color:#DA2342}
.fx-dots{display:flex;justify-content:center;gap:6px;margin-top:4px}
.fx-dots i{width:8px;height:8px;border-radius:50%;background:rgba(10,10,10,.25)}
.fx-dots i.on{background:#0A0A0A}
@media (max-width:560px){.fx-card{flex-basis:72vw}.fx-btns{display:none}}`;
  document.head.append(css);

  const sec = document.createElement('section');
  sec.className = 'fx-sec pad';
  sec.id = 'featured-strip';
  sec.setAttribute('aria-label', 'Featured right now');
  sec.innerHTML = `<div class="fx-head"><div><h2>On the shelf now.</h2><p>One-of-one glass, studio store pieces and the merch the crew wears. It turns over, so look twice.</p></div>
<div class="fx-btns"><button type="button" data-d="-1" aria-label="Previous">←</button><button type="button" data-d="1" aria-label="Next">→</button></div></div>
<div class="fx-track" tabindex="0" aria-label="Featured products"></div><div class="fx-dots" aria-hidden="true"></div>`;
  anchor.before(sec);
  const track = sec.querySelector('.fx-track'), dots = sec.querySelector('.fx-dots');

  const load = (src, ready) => new Promise((go) => {
    if (ready()) return go();
    const s = document.createElement('script');
    s.src = base + src;
    s.onload = s.onerror = () => go();
    document.head.append(s);
  });

  const build = () => {
    const G = window.JB_GLASS || { pieces: [] }, S = window.JBShop || { items: [], featured: [] };
    const live = G.pieces.filter((p) => p.online !== false && p.status === 'available');
    const take = (f, n) => shuffle(live.filter(f)).slice(0, n);
    const glass = [
      ...take((p) => p.shelf === 'giant', 2), ...take((p) => p.shelf === 'le', 3), ...take((p) => p.shelf === 'og', 1),
      ...take((p) => p.shop === 'shopify' && p.shelf === 'studio', 3), ...take((p) => p.shelf === 'creatures', 2),
      ...take((p) => p.shop === 'shopify' && p.shelf === 'daily', 1),
    ].map((p) => ({
      href: `${base}glass/#p=${encodeURIComponent(p.id)}`, img: `${base}assets/glass/${p.id}_t.webp`, name: p.name,
      sub: p.shop === 'shopify' ? 'Studio store' : (p.series || 'Glass'), price: p.price, tag: p.edition || (p.shop ? 'In stock' : '1 of 1'), kind: 'glass',
    }));
    const byId = new Map(S.items.map((p) => [p.id, p]));
    const ours = shuffle((S.featured || []).map((id) => byId.get(id)).filter((p) => p && p.inStock)).slice(0, 4);
    const theirs = shuffle(S.items.filter((p) => p.shop === 'shopify' && p.inStock && !/gift card/i.test(p.name))).slice(0, 4);
    const merch = [...ours, ...theirs].map((p) => ({
      href: `${base}shop/#p=${encodeURIComponent(p.slug)}`, img: base + p.imgs[0].replace(/\.webp$/, '_t.webp'), full: base + p.imgs[0],
      name: p.name.split(/\s+[–—-]\s+/)[0], sub: p.shop === 'shopify' ? 'Studio store merch' : (p.name.split(/\s+[–—-]\s+/)[1] || 'Ritual Merch'), price: p.price, tag: 'Merch', kind: 'merch',
    }));
    const mix = [];
    shuffle(glass);
    shuffle(merch);
    // glass, merch, glass, merch... with the extra glass doubled up near the end
    while (glass.length || merch.length) { if (glass.length) mix.push(glass.shift()); if (merch.length) mix.push(merch.shift()); }
    const T = ['-1.5deg', '1deg', '-.5deg', '1.5deg', '-1deg', '.5deg'];
    track.innerHTML = mix.map((c, i) => `<a class="fx-card ${c.kind}" href="${c.href}" style="--t:${T[i % T.length]}">
<span class="fx-pic"><span class="fx-tag">${esc(c.tag)}</span><img src="${esc(c.img)}" alt="" loading="lazy" decoding="async"${c.full ? ` onerror="this.onerror=null;this.src='${esc(c.full)}'"` : ''}></span>
<span class="fx-meta"><b>${esc(c.name)}</b><span>${esc(c.sub)}</span><i>${money(c.price)}<small>${c.kind === 'glass' ? 'SEE IT →' : 'GET IT →'}</small></i></span></a>`).join('');
    dots.innerHTML = mix.map(() => '<i></i>').join('');
    rotate(mix.length);
  };

  // ---------- the drift ----------
  function rotate(n) {
    const step = () => { const c = track.children[0], c2 = track.children[1]; return c && c2 ? c2.offsetLeft - c.offsetLeft : track.clientWidth * .8; };
    const at = () => Math.round(track.scrollLeft / Math.max(1, step()));
    const mark = () => { const k = at(); [...dots.children].forEach((d, i) => d.classList.toggle('on', i === k)); };
    const go = (d) => {
      const end = track.scrollWidth - track.clientWidth - 4;
      if (d > 0 && track.scrollLeft >= end) track.scrollTo({ left: 0, behavior: reduce ? 'auto' : 'smooth' });
      else if (d < 0 && track.scrollLeft <= 4) track.scrollTo({ left: end, behavior: reduce ? 'auto' : 'smooth' });
      else track.scrollBy({ left: d * step(), behavior: reduce ? 'auto' : 'smooth' });
    };
    sec.querySelector('.fx-btns').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) { go(+b.dataset.d); hold(6000); } });
    track.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
    mark();
    if (reduce || n < 2) return;
    let pauseUntil = 0, held = false, seen = false;
    const hold = (ms) => { pauseUntil = performance.now() + ms; };
    track.addEventListener('pointerenter', () => (held = true));
    track.addEventListener('pointerleave', () => { held = false; hold(2500); });
    track.addEventListener('touchstart', () => { held = true; }, { passive: true });
    track.addEventListener('touchend', () => { held = false; hold(5000); }, { passive: true });
    track.addEventListener('focusin', () => (held = true));
    track.addEventListener('focusout', () => { held = false; hold(2500); });
    new IntersectionObserver((es) => es.forEach((e) => (seen = e.isIntersecting)), { threshold: .3 }).observe(track);
    setInterval(() => { if (seen && !held && !document.hidden && performance.now() > pauseUntil) go(1); }, 3800);
  }

  // only fetch the catalogs once the strip is close
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    Promise.all([load('js/glass-data.js', () => window.JB_GLASS), load('js/shop-data.js', () => window.JBShop)]).then(build);
  }, { rootMargin: '600px 0px' });
  io.observe(sec);
})();
