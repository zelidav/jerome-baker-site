/* Product page (shop/<slug>/): option chips, quantity, and the checkout link. The page is complete without this
   (title, copy, photos, price and a plain Buy link all come in the HTML); this makes Buy go to the exact variant. */
(() => {
  const el = document.getElementById('pp');
  if (!el) return;
  const P = JSON.parse(el.dataset.pp);
  const $ = (id) => document.getElementById(id);
  const buy = $('ppBuy'), note = $('ppNote'), img = $('ppImg');
  const noteNodes = [...note.childNodes].map((n) => n.cloneNode(true));
  const sel = {};
  let qty = 1;
  const match = (val, term) => !val || val.toLowerCase() === term[1] || val.toLowerCase() === term[0].toLowerCase();
  const findVar = (s) => P.variations.find(([, va]) => P.attrs.every((a) => !s[a.name] || match(va[a.name], s[a.name])));
  const cartUrl = () => {
    if (P.shop === 'shopify') {
      const v = P.attrs.length ? findVar(sel) : P.variations[0];
      return v ? `${P.store}/cart/${v[0]}:${qty}` : '';
    }
    let u = P.wooStore + '/cart/?add-to-cart=' + P.id + '&quantity=' + qty;
    if (P.attrs.length) {
      const v = findVar(sel);
      if (!v) return '';
      u += '&variation_id=' + v[0];
      P.attrs.forEach((a) => { u += '&' + a.key + '=' + encodeURIComponent(v[1][a.name] || (a.key.startsWith('attribute_pa_') ? sel[a.name][1] : sel[a.name][0])); });
    }
    return u;
  };
  const sync = () => {
    if (!P.inStock) return;
    const missing = P.attrs.filter((a) => !sel[a.name]).map((a) => a.name.toLowerCase());
    const url = missing.length ? '' : cartUrl();
    if (url) { buy.href = url; buy.removeAttribute('aria-disabled'); note.replaceChildren(...noteNodes.map((n) => n.cloneNode(true))); }
    else {
      buy.setAttribute('aria-disabled', 'true');
      note.textContent = missing.length ? 'Pick ' + missing.map((w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w).join(' and ') + ' first.' : 'That combination is not available.';
    }
  };
  document.querySelectorAll('.pp-opt').forEach((fs) => {
    const a = P.attrs.find((x) => x.name === fs.dataset.attr);
    const chips = [...fs.querySelectorAll('.pp-chip')];
    const pick = (b) => {
      sel[a.name] = a.terms.find((t) => t[0] === b.dataset.val);
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      sync();
    };
    chips.forEach((b) => b.addEventListener('click', () => pick(b)));
    if (chips.length === 1) pick(chips[0]);
  });
  const setQty = (n) => { qty = Math.max(1, Math.min(99, n)); $('ppQty').textContent = qty; sync(); };
  $('ppMinus').addEventListener('click', () => setQty(qty - 1));
  $('ppPlus').addEventListener('click', () => setQty(qty + 1));
  buy.addEventListener('click', (e) => {
    if (buy.hasAttribute('aria-disabled')) { e.preventDefault(); note.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 240); }
  });
  document.querySelectorAll('.pp-thumbs button').forEach((b) => b.addEventListener('click', () => {
    img.src = b.dataset.src;
    document.querySelectorAll('.pp-thumbs button').forEach((x) => x.removeAttribute('aria-current'));
    b.setAttribute('aria-current', 'true');
  }));
  if (P.attrs.length) sync();
})();
