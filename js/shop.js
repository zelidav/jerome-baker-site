/* Ritual Merch. Renders js/shop-data.js (built by tools/build_shop.py). Checkout happens on jeromebakerny.com. */
(() => {
  const D = window.JBShop;
  const base = document.documentElement.dataset.base || '';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
  const slugify = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const byId = new Map(D.items.map((p) => [p.id, p]));
  const bySlug = new Map(D.items.map((p) => [p.slug, p]));

  // "Men’s High Top – NY Drop 1- Solid Color, Sativa Style" -> title + sub
  const split = (name) => {
    const parts = name.split(/\s*[–—]\s*|-\s+/).map((s) => s.trim()).filter(Boolean);
    return { title: parts[0], sub: parts.slice(1).join(' · ') };
  };
  const STRAIN = { Indica: ['#DA2342', '#FF8FA3'], Sativa: ['#FFF100', '#FFF100'], Hybrid: ['#05B48F', '#7FF0D2'] };
  const strainOf = (p) => (p.name.match(/Indica|Sativa|Hybrid/) || [])[0] ||
    (/Red\b/.test(p.name) ? 'Indica' : /Yellow\b/.test(p.name) ? 'Sativa' : /Green\b/.test(p.name) ? 'Hybrid' : '');
  const TILTS = ['-2deg', '1.5deg', '-1deg', '2deg', '-1.5deg', '1deg'];
  // cards use the 480px thumbnail (built next to each photo); the product view loads the full 900px one
  const thumb = (src) => src.replace(/\.webp$/, '_t.webp');

  const card = (p, i) => {
    const { title, sub } = split(p.name);
    const st = strainOf(p);
    const c = D.crew[p.crew];
    const bg = st ? STRAIN[st][0] : ['#FFFFFF', '#FDB514', '#F1F1F1'][i % 3];
    return `<button type="button" class="pcard" data-slug="${esc(p.slug)}" style="--bg:${bg};--tilt:${TILTS[i % TILTS.length]}" aria-label="${esc(p.name)}, ${money(p.price)}">
<span class="pic">${p.imgs[1] ? `<img class="alt" src="${base}${thumb(p.imgs[1])}" alt="" loading="lazy" decoding="async">` : ''}<img class="main" src="${base}${thumb(p.imgs[0])}" alt="" loading="lazy" decoding="async"></span>
${c ? `<img class="worn" src="${base}assets/crew/${c.img}_s.webp" alt="" loading="lazy">` : ''}
${st ? `<span class="strain" style="--sc:${STRAIN[st][1]}">${st.toUpperCase()}</span>` : ''}
${p.inStock ? '' : '<span class="soldout">GONE</span>'}
<span class="meta"><h3>${esc(title)}</h3>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}<span class="row"><span class="pr">${money(p.price)}</span><span class="go">${p.attrs.length ? 'PICK SIZE →' : 'GET IT →'}</span></span></span>
</button>`;
  };

  // ---------- Featured rail ----------
  const rail = $('rail');
  rail.innerHTML = D.featured.map((id, i) => byId.get(id)).filter(Boolean).map(card).join('');
  const nudge = (dir) => rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
  $('railPrev').onclick = () => nudge(-1);
  $('railNext').onclick = () => nudge(1);

  // ---------- Collection filters ----------
  const tree = D.tree;
  const kidsOf = Object.fromEntries(tree);
  const inCat = (p, cat) => !cat || p.cats.includes(cat) || (kidsOf[cat] || []).some((k) => p.cats.includes(k));
  const prices = D.items.map((p) => p.price);
  const lo = Math.floor(Math.min(...prices)), hi = Math.ceil(Math.max(...prices));
  const st = { cat: '', sort: 'default', q: '', min: lo, max: hi };

  const catBtn = (cat, cls) => {
    const n = D.items.filter((p) => inCat(p, cat)).length;
    return `<button type="button" data-cat="${esc(cat)}" class="${cls || ''}">${esc(cat)}<span class="n">${n}</span></button>`;
  };
  $('cats').innerHTML = `<li class="top">${catBtn('', '').replace('<span class="n">', 'All merch<span class="n">')}</li>` +
    tree.map(([top, kids]) => `<li class="top">${catBtn(top)}<ul>${kids.map((k) => `<li>${catBtn(k)}</li>`).join('')}</ul></li>`).join('');

  const pmin = $('pmin'), pmax = $('pmax');
  [pmin, pmax].forEach((r) => { r.min = lo; r.max = hi; r.step = 1; });
  pmin.value = lo; pmax.value = hi;

  const grid = $('grid');
  const render = () => {
    const q = st.q.trim().toLowerCase();
    let list = D.items.filter((p) => inCat(p, st.cat) && p.price >= st.min && p.price <= st.max &&
      (!q || q.split(/\s+/).every((w) => (p.name + ' ' + p.cats.join(' ')).toLowerCase().includes(w))));
    const cmp = {
      'default': (a, b) => a.name.localeCompare(b.name),
      'name-asc': (a, b) => a.name.localeCompare(b.name),
      'name-desc': (a, b) => b.name.localeCompare(a.name),
      'price-asc': (a, b) => a.price - b.price || a.name.localeCompare(b.name),
      'price-desc': (a, b) => b.price - a.price || a.name.localeCompare(b.name)
    }[st.sort];
    list = list.slice().sort(cmp);
    grid.innerHTML = list.length ? list.map(card).join('') :
      `<div class="empty" style="grid-column:1/-1"><img src="${base}assets/crew/peeper_s.webp" alt="">Peeper looked everywhere. Nothing matches that. <button type="button" class="clear" data-clear>Clear the filters</button></div>`;
    $('count').textContent = `SHOWING ${list.length} OF ${D.items.length}` + (st.cat ? ` · ${st.cat.toUpperCase()}` : '');
    document.querySelectorAll('#cats button').forEach((b) => b.classList.toggle('on', b.dataset.cat === st.cat));
    document.querySelectorAll('.subnav a').forEach((a) => a.classList.toggle('on', a.dataset.cat === st.cat));
    const a = (st.min - lo) / (hi - lo) * 100, b = (st.max - lo) / (hi - lo) * 100;
    $('pfill').style.left = a + '%'; $('pfill').style.width = (b - a) + '%';
    $('pminv').textContent = money(st.min); $('pmaxv').textContent = money(st.max);
  };

  const allCats = ['', ...tree.flatMap(([t, k]) => [t, ...k])];
  const setCat = (cat, scroll) => {
    st.cat = cat;
    const h = cat ? '#cat=' + slugify(cat) : '#collection';
    if (location.hash !== h) history.replaceState(null, '', h);
    render();
    if (scroll) $('collection').scrollIntoView({ behavior: 'smooth' });
  };
  $('cats').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setCat(b.dataset.cat); });
  $('sort').onchange = (e) => { st.sort = e.target.value; render(); };
  $('q').oninput = (e) => { st.q = e.target.value; render(); };
  pmin.oninput = () => { st.min = Math.min(+pmin.value, st.max); pmin.value = st.min; render(); };
  pmax.oninput = () => { st.max = Math.max(+pmax.value, st.min); pmax.value = st.max; render(); };
  const clearAll = () => {
    Object.assign(st, { cat: '', sort: 'default', q: '', min: lo, max: hi });
    $('sort').value = 'default'; $('q').value = ''; pmin.value = lo; pmax.value = hi;
    history.replaceState(null, '', '#collection'); render();
  };
  $('clear').onclick = clearAll;
  grid.addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) clearAll(); });

  const ft = $('ftoggle'), fl = $('filters');
  ft.onclick = () => { const o = !fl.classList.contains('open'); fl.classList.toggle('open', o); ft.setAttribute('aria-expanded', o); };
  document.addEventListener('click', (e) => {
    if (fl.classList.contains('open') && !fl.contains(e.target) && e.target !== ft) { fl.classList.remove('open'); ft.setAttribute('aria-expanded', 'false'); }
  });

  // ---------- Product dialog ----------
  const pd = $('pd');
  const match = (val, term) => !val || val.toLowerCase() === term[1] || val.toLowerCase() === term[0].toLowerCase();
  const findVar = (p, sel) => p.variations.find(([, va]) => p.attrs.every((a) => !sel[a.name] || match(va[a.name], sel[a.name])));
  const cartUrl = (p, sel, qty) => {
    let u = D.store + '/cart/?add-to-cart=' + p.id + '&quantity=' + qty;
    if (p.attrs.length) {
      const v = findVar(p, sel);
      if (!v) return '';
      u += '&variation_id=' + v[0];
      p.attrs.forEach((a) => { u += '&' + a.key + '=' + encodeURIComponent(v[1][a.name] || (a.key.startsWith('attribute_pa_') ? sel[a.name][1] : sel[a.name][0])); });
    }
    return u;
  };
  const SIZE_ORDER = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', 'S/M', 'L/XL'];
  const sortTerms = (a) => a.name.toLowerCase() !== 'size' ? a.terms : a.terms.slice().sort((x, y) => {
    const ix = SIZE_ORDER.indexOf(x[0]), iy = SIZE_ORDER.indexOf(y[0]);
    if (ix > -1 && iy > -1) return ix - iy;
    const nx = parseFloat(x[0]), ny = parseFloat(y[0]);
    return isNaN(nx) || isNaN(ny) ? x[0].localeCompare(y[0]) : nx - ny;
  });

  let lastFocus = null;
  const open = (slug, push) => {
    const p = bySlug.get(slug);
    if (!p) return;
    const { title, sub } = split(p.name);
    const c = D.crew[p.crew];
    const sel = {};
    let qty = 1, img = 0;
    const firstCat = tree.find(([t, k]) => p.cats.includes(t) || k.some((x) => p.cats.includes(x)));
    const rec = D.items.filter((x) => x.id !== p.id && x.cats.some((k) => p.cats.includes(k) && k !== 'Collections'))
      .sort((a, b) => (a.id * 7919 % 97) - (b.id * 7919 % 97)).slice(0, 4);
    pd.innerHTML = `<button type="button" class="pd-x" aria-label="Close">×</button>
<div class="pd-crumb"><a href="#collection" data-close>RITUAL MERCH</a>${firstCat ? ` / <a href="#cat=${slugify(firstCat[0])}" data-close>${esc(firstCat[0].toUpperCase())}</a>` : ''} / ${esc(title.toUpperCase())}</div>
<div class="pd-main">
<div class="pd-gal"><div class="pd-big"><img id="pdImg" src="${base}${p.imgs[0]}" alt="${esc(p.name)}"></div>
${p.imgs.length > 1 ? `<div class="pd-thumbs">${p.imgs.map((s, i) => `<button type="button" data-img="${i}" class="${i ? '' : 'on'}" aria-label="Photo ${i + 1}"><img src="${base}${thumb(s)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}</div>
<div class="pd-info">
<h2 id="pdTitle">${esc(title)}</h2>${sub ? `<span class="sub">${esc(sub.toUpperCase())}</span>` : ''}
<span class="pd-price">${money(p.price)}</span>
${p.desc ? `<p class="pd-desc">${esc(p.desc)}</p>` : ''}
${p.attrs.map((a) => `<div class="opt" data-attr="${esc(a.name)}"><h4>${esc(a.name.toUpperCase())} <span></span></h4><div class="chips">${sortTerms(a).map((t) => `<button type="button" aria-pressed="false" data-term="${esc(t[1])}">${esc(t[0])}</button>`).join('')}</div></div>`).join('')}
<div class="buy"><div class="qty"><button type="button" data-q="-1" aria-label="One less">−</button><output id="pdQty">1</output><button type="button" data-q="1" aria-label="One more">+</button></div>
<a class="btn btn-red" id="pdBuy" target="_blank" rel="noopener">Add to cart</a></div>
<p class="pd-note" id="pdNote"></p>
${c ? `<a class="wornby" href="${base}crew/${p.crew}/" style="--wc:${c.color}"><img src="${base}assets/crew/${c.img}_s.webp" alt=""><span><small>WORN BY</small><b>${esc(c.name)}</b></span></a>` : ''}
</div></div>
${rec.length ? `<div class="pd-rec"><h3>Recommended products</h3><div class="grid">${rec.map(card).join('')}</div></div>` : ''}`;

    const buy = $('pdBuy'), note = $('pdNote');
    const sync = () => {
      pd.querySelectorAll('.opt').forEach((o) => {
        const a = p.attrs.find((x) => x.name === o.dataset.attr);
        o.querySelector('h4 span').textContent = sel[a.name] ? sel[a.name][0] : '';
        o.querySelectorAll('.chips button').forEach((b) => {
          const t = a.terms.find((x) => x[1] === b.dataset.term);
          b.setAttribute('aria-pressed', sel[a.name] === t);
          b.disabled = !findVar(p, { ...sel, [a.name]: t });
        });
      });
      const missing = p.attrs.filter((a) => !sel[a.name]).map((a) => a.name.toLowerCase());
      const url = p.inStock && !missing.length ? cartUrl(p, sel, qty) : '';
      if (url) { buy.href = url; buy.removeAttribute('aria-disabled'); } else { buy.removeAttribute('href'); buy.setAttribute('aria-disabled', 'true'); }
      buy.textContent = p.inStock ? 'Add to cart' : 'Gone forever';
      note.innerHTML = !p.inStock ? 'This one sold out. Told you.' : missing.length ? `Pick a ${esc(missing.join(' and a '))} first.` :
        `Adds it to your cart on <a href="${esc(p.url)}" target="_blank" rel="noopener">jeromebakerny.com</a>, where checkout and shipping happen.`;
      $('pdQty').textContent = qty;
    };
    pd.onclick = (e) => {
      const t = e.target;
      if (t === pd || t.closest('.pd-x') || t.closest('[data-close]')) { close(); if (t.closest('[data-close]')) { const h = t.closest('a').getAttribute('href'); route(h, true); e.preventDefault(); } return; }
      const chip = t.closest('.chips button');
      if (chip) {
        const a = p.attrs.find((x) => x.name === chip.closest('.opt').dataset.attr);
        const term = a.terms.find((x) => x[1] === chip.dataset.term);
        sel[a.name] = sel[a.name] === term ? undefined : term;
        return sync();
      }
      const q = t.closest('[data-q]');
      if (q) { qty = Math.max(1, Math.min(20, qty + +q.dataset.q)); return sync(); }
      const th = t.closest('[data-img]');
      if (th) {
        img = +th.dataset.img; $('pdImg').src = base + p.imgs[img];
        pd.querySelectorAll('.pd-thumbs button').forEach((b, i) => b.classList.toggle('on', i === img));
        return;
      }
      const pc = t.closest('.pcard');
      if (pc) { open(pc.dataset.slug, true); pd.scrollTop = 0; return; }
      if (t.closest('#pdBuy[aria-disabled]')) { e.preventDefault(); note.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 240); }
    };
    // single-option attributes come preselected
    p.attrs.forEach((a) => { if (a.terms.length === 1) sel[a.name] = a.terms[0]; });
    sync();
    if (!pd.open) { lastFocus = document.activeElement; pd.showModal(); }
    pd.querySelector('.pd-x').focus();
    const h = '#p=' + p.slug;
    if (location.hash !== h) history[push ? 'pushState' : 'replaceState'](null, '', h);
    document.title = p.name + '. Ritual Merch. Jerome Baker';
  };
  const close = () => {
    if (!pd.open) return;
    pd.close();
    document.title = 'Ritual Merch. Jerome Baker';
    if (location.hash.startsWith('#p=')) history.replaceState(null, '', st.cat ? '#cat=' + slugify(st.cat) : location.pathname);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  };
  pd.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

  document.addEventListener('click', (e) => {
    const pc = e.target.closest('.pcard');
    if (pc && !pd.contains(pc)) open(pc.dataset.slug, true);
  });

  // ---------- Routing: #p=<slug>, #cat=<slug> ----------
  const route = (h, scroll) => {
    h = h || location.hash;
    if (h.startsWith('#p=')) return open(decodeURIComponent(h.slice(3)));
    close();
    if (h.startsWith('#cat=')) {
      const cat = allCats.find((c) => c && slugify(c) === h.slice(5));
      if (cat !== undefined) return setCat(cat, true);
    }
    if (scroll && h.length > 1) document.querySelector(h)?.scrollIntoView({ behavior: 'smooth' });
  };
  document.querySelectorAll('.subnav a, .sfoot a[href^="#cat="]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); route(a.getAttribute('href'), true); }));
  addEventListener('popstate', () => route());
  addEventListener('hashchange', () => route());

  // keep the sticky subnav under the header
  const hdr = $('hdr');
  const setH = () => document.documentElement.style.setProperty('--hdr', hdr.offsetHeight + 'px');
  setH(); addEventListener('resize', setH);

  render();
  if (location.hash) route(location.hash, true);
})();
