/* Drop-down menus on the top bar (css/megamenu.css). Hover Glass, Ritual Merch, The JB Crew or Wholesale and a
   torn sheet of paper drops out of the blue header with everything in that part of the shop: every glass shelf with
   a piece from it, every merch category (the art, home and gift stuff too, not just tees), all twenty crew, the two
   wholesale tracks. A crew member peeks over the edge of the sheet.
   Mouse: opens on hover (with a short delay so passing over the bar doesn't fire it), closes when you leave.
   Keyboard: focus a link and press Down (or Enter on the arrow) to go in, Esc to close. Touch on a wide screen:
   the first tap opens it, the second follows the link. Phones: the dock's sticker pile (js/dock.js) gets the
   shelves and categories as small chips under Glass and Ritual Merch.
   The catalogs (js/glass-data.js, js/shop-data.js, js/crew-data.js) only load the first time a menu opens. */
(() => {
  if (window.JBMega) return;
  const head = document.querySelector('header.top, header.topbar');
  const nav = head && head.querySelector('nav[aria-label="Main"]');
  if (!nav) return;
  const base = document.documentElement.dataset.base || '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slugify = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const thumb = (src) => base + String(src).replace(/\.webp$/, '_t.webp');

  // ---------- data, on first open ----------
  const loaded = {};
  const load = (file, ready) => {
    if (ready()) return Promise.resolve(ready());
    if (!loaded[file]) loaded[file] = new Promise((ok) => {
      const s = document.createElement('script');
      s.src = base + file;
      s.onload = () => ok(ready());
      s.onerror = () => ok(null);
      document.head.appendChild(s);
    });
    return loaded[file];
  };
  const glass = () => load('js/glass-data.js', () => window.JB_GLASS);
  const shop = () => load('js/shop-data.js', () => window.JBShop);
  const crew = () => load('js/crew-data.js', () => window.JB_CREW);

  // ---------- what each menu holds ----------
  const MENUS = {
    'glass/': {
      peek: 'lion', say: 'Hands off the giants.',
      async build() {
        const D = await glass();
        if (!D) return '';
        const shelves = D.shelves.map((s) => {
          const ps = D.pieces.filter((p) => p.shelf === s.key);
          const show = ps.find((p) => p.status === 'available' && p.w) || ps.find((p) => p.w) || ps[0];
          return { s, n: ps.length, img: show ? base + 'assets/glass/' + show.id + '_t.webp' : '' };
        }).filter((x) => x.n);
        return `<p class="mm-h">Every shelf in the shop</p><ul class="mm-shelves">${shelves.map((x, i) =>
          `<li style="--t:${((i * 5) % 7 - 3) * .9}deg"><a class="mm-stk" href="${base}glass/#s-${esc(x.s.key)}"><span class="mm-pic"><img src="${esc(x.img)}" alt="" loading="lazy" decoding="async"></span><span class="mm-tx"><b>${esc(x.s.title)}</b><small>${x.n} ${x.n === 1 ? 'piece' : 'pieces'}</small></span></a></li>`).join('')}</ul>
          <p class="mm-foot"><a href="${base}glass/">See all the glass</a><a href="${base}glass/#s-giant">The giants, 44 to 64 inches</a></p>`;
      },
    },
    'shop/': {
      peek: 'bear', say: 'The art\'s in here too.',
      async build() {
        const D = await shop();
        if (!D) return '';
        const items = D.items || [];
        const n = (c) => items.filter((i) => (i.cats || []).includes(c)).length;
        const pic = (c) => { const it = items.find((i) => (i.cats || []).includes(c) && i.imgs && i.imgs.length); return it ? thumb(it.imgs[0]) : ''; };
        // the non-apparel goes first so nobody misses it
        const order = ['Art & Home', 'Accessories', 'Footwear', 'Tops', 'Collections'];
        const tree = [...D.tree].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
        return `<p class="mm-h">More than tees</p><div class="mm-cols">${tree.map(([top, subs]) => `<div class="mm-col${top === 'Art & Home' ? ' hot' : ''}">
          <a class="mm-top" href="${base}shop/#cat=${slugify(top)}">${esc(top)}<small>${n(top) || subs.reduce((s, c) => s + n(c), 0)}</small></a>
          <ul>${subs.filter((c) => n(c)).map((c, i) => `<li style="--t:${((i * 3) % 5 - 2) * 1.1}deg"><a class="mm-chip" href="${base}shop/#cat=${slugify(c)}"><span class="mm-dot"><img src="${esc(pic(c))}" alt="" loading="lazy" decoding="async"></span>${esc(c)}<small>${n(c)}</small></a></li>`).join('')}</ul></div>`).join('')}</div>
          <p class="mm-foot"><a href="${base}shop/">The whole collection</a><a href="${base}crew/match/">Find your crew, find your fit</a></p>`;
      },
    },
    'crew/': {
      peek: 'peeper', say: 'Pick one. We don\'t bite.',
      async build() {
        const C = await crew();
        if (!C) return '';
        return `<p class="mm-h">Twenty of them. Pick one.</p><ul class="mm-crew">${C.map((c, i) =>
          `<li style="--t:${((i * 7) % 9 - 4) * 1.2}deg"><a href="${base}crew/${esc(c.slug)}/"><img src="${base}assets/crew/${esc(c.img)}_s.webp" alt="" loading="lazy" decoding="async"><span>${esc(c.name)}</span></a></li>`).join('')}</ul>
          <p class="mm-foot"><a href="${base}crew/">Meet the whole crew</a><a href="${base}crew/match/">Four questions: which one are you?</a></p>`;
      },
    },
    'wholesale/': {
      peek: 'bot', say: 'Bulk orders. Beep.',
      async build() {
        return `<p class="mm-h">Carry JB in your store</p><div class="mm-tracks">
          <a class="mm-track" href="${base}wholesale/#anywhere"><b>Glass and merch, any state</b><span>Sm0ke shops, galleries and boutiques. The Baker Classic, studio pieces and the merch, at wholesale.</span></a>
          <a class="mm-track ny" href="${base}wholesale/#ny"><b>The New York program</b><span>For licensed d!spensaries: signature glass with provenance, budtender training and the JB brand program.</span></a>
          </div><p class="mm-foot"><a href="${base}wholesale/#talk">Talk to us</a></p>`;
      },
    },
  };

  // ---------- the sheet ----------
  const panel = document.createElement('div');
  panel.className = 'mm';
  panel.id = 'jbMega';
  panel.hidden = true;
  panel.innerHTML = '<div class="mm-sheet"><div class="mm-in"></div></div><img class="mm-peek" alt="" aria-hidden="true"><p class="mm-say" aria-hidden="true"></p>';
  const inner = panel.querySelector('.mm-in'), peekImg = panel.querySelector('.mm-peek'), sayEl = panel.querySelector('.mm-say');
  head.appendChild(panel);

  const keyOf = (a) => {
    const h = (a.getAttribute('href') || '').replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
    if (MENUS[h]) return h;
    // on the glass page its own link is "./"
    const path = new URL(a.href, location.href).pathname;
    return Object.keys(MENUS).find((k) => path.endsWith('/' + k)) || null;
  };
  const links = [...nav.querySelectorAll('a')].filter((a) => !a.classList.contains('btn') && keyOf(a));
  if (!links.length) return;

  let cur = null, openT = 0, closeT = 0, built = {};
  // the dock takes over the menu on phones (css/dock.css, max-width 760px)
  const desktop = () => innerWidth > 760;
  const place = (a) => {
    const hr = head.getBoundingClientRect(), ar = a.getBoundingClientRect();
    panel.style.top = (hr.height - 2) + 'px';
    // the sheet sits under its link, kept on screen
    const w = Math.min(panel.offsetWidth || 760, innerWidth - 32);
    // room on the right for the crew member peeking over the corner
    const left = Math.max(16, Math.min(innerWidth - w - 64, ar.left + ar.width / 2 - w * .35)) - hr.left;
    panel.style.left = left + 'px';
    panel.style.setProperty('--nub', (ar.left + ar.width / 2 - hr.left - left) + 'px');
  };
  const open = async (a, focusIn) => {
    clearTimeout(closeT);
    const k = keyOf(a);
    if (!k) return;
    if (cur === a && !panel.hidden) { if (focusIn) focusFirst(); return; }
    links.forEach((l) => l.setAttribute('aria-expanded', l === a ? 'true' : 'false'));
    cur = a;
    const m = MENUS[k];
    panel.dataset.k = k.replace('/', '');
    if (!built[k]) { inner.innerHTML = '<p class="mm-h">Loading the shelves</p>'; }
    else inner.innerHTML = built[k];
    peekImg.src = base + 'assets/crew/' + m.peek + '_s.webp';
    sayEl.textContent = m.say;
    const wasHidden = panel.hidden;
    panel.hidden = false;
    place(a);
    if (wasHidden && !reduce) { panel.classList.remove('in'); void panel.offsetWidth; }
    panel.classList.add('in');
    if (!built[k]) {
      built[k] = await m.build();
      if (cur === a) { inner.innerHTML = built[k]; place(a); }
    }
    if (focusIn) focusFirst();
  };
  let quiet = false;  // Esc puts focus back on the link: that focus must not open it again
  const close = (back) => {
    clearTimeout(openT);
    if (panel.hidden) return;
    const was = cur;
    panel.classList.remove('in');
    panel.hidden = true;
    links.forEach((l) => l.setAttribute('aria-expanded', 'false'));
    cur = null;
    if (back && was) { quiet = true; was.focus(); quiet = false; }
  };
  const focusFirst = () => { const f = panel.querySelector('a'); if (f) f.focus(); };

  links.forEach((a) => {
    a.setAttribute('aria-haspopup', 'true');
    a.setAttribute('aria-expanded', 'false');
    a.setAttribute('aria-controls', 'jbMega');
    a.addEventListener('mouseenter', () => { if (!desktop()) return; clearTimeout(openT); clearTimeout(closeT); openT = setTimeout(() => open(a), cur ? 60 : 140); });
    a.addEventListener('mouseleave', () => { clearTimeout(openT); closeT = setTimeout(close, 260); });
    a.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(a, true); }
      if (e.key === 'Escape') close(true);
    });
    a.addEventListener('focus', () => { if (!quiet && desktop() && a.matches(':focus-visible')) open(a); });
    // touch on a wide screen: first tap opens, second tap goes
    a.addEventListener('click', (e) => {
      if (!desktop() || !matchMedia('(hover: none)').matches) return;
      if (cur !== a || panel.hidden) { e.preventDefault(); open(a); }
    });
  });
  panel.addEventListener('mouseenter', () => clearTimeout(closeT));
  panel.addEventListener('mouseleave', () => { closeT = setTimeout(close, 260); });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    if (e.key === 'Tab') {
      const all = [...panel.querySelectorAll('a')];
      const i = all.indexOf(document.activeElement);
      // tabbing off the end of the sheet goes on to the next menu link
      if (!e.shiftKey && i === all.length - 1) { const n = links[links.indexOf(cur) + 1] || [...nav.querySelectorAll('a')].find((x) => x.compareDocumentPosition(cur) & 2); close(); if (n) { e.preventDefault(); n.focus(); } }
      if (e.shiftKey && i === 0) { e.preventDefault(); const c = cur; close(); c.focus(); }
    }
  });
  document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !panel.contains(e.target) && !links.includes(e.target.closest('a'))) close(); });
  addEventListener('resize', () => { if (!panel.hidden && cur) place(cur); });
  addEventListener('scroll', () => { if (!panel.hidden && !head.matches('.top')) close(); }, { passive: true });
  // following a link inside the sheet that only changes the h@sh on this page: close it
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) setTimeout(close, 0); });

  // ---------- phones: chips in the dock's sticker pile ----------
  const pileChips = async () => {
    const pile = document.getElementById('dockPile');
    if (!pile || pile.dataset.mm) return;
    pile.dataset.mm = '1';
    const add = (label, html) => {
      const a = [...pile.querySelectorAll('.stk')].find((x) => x.firstChild && x.firstChild.textContent.trim() === label);
      if (!a || !html) return;
      const li = a.closest('li');
      const row = document.createElement('div');
      row.className = 'mm-pile';
      row.innerHTML = html;
      li.appendChild(row);
    };
    const [G, S] = await Promise.all([glass(), shop()]);
    if (G) add('Glass', G.shelves.filter((s) => G.pieces.some((p) => p.shelf === s.key)).map((s) => `<a href="${base}glass/#s-${esc(s.key)}">${esc(s.title)}</a>`).join(''));
    if (S) {
      const cats = ['Art & Home', 'Prints & Paintings', 'Home & Kitchen', 'Gift Cards', 'Accessories', 'Hats', 'Bags & Backpacks', 'Footwear', 'Tops', 'Studio Store'];
      add('Ritual Merch', cats.filter((c) => (S.items || []).some((i) => (i.cats || []).includes(c))).map((c) => `<a href="${base}shop/#cat=${slugify(c)}">${esc(c)}</a>`).join(''));
    }
  };
  const bowl = document.querySelector('.dock .bowl');
  if (bowl) bowl.addEventListener('click', pileChips, { once: true });

  window.JBMega = { open: (k) => { const a = links.find((l) => keyOf(l) === k); if (a) open(a); }, close };
})();
