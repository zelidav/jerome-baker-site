/* "Get the fit": three bundles under "What <name> is wearing" on each crew page.
   Just the piece / The fit (the character's pick, best value per item) / Full fit. All real items at today's
   prices; the "separately" total is the real sum, so nothing is a fake "was" price.
   TEST MODE like js/promo.js: the bundle code starts with TEST- and does nothing at checkout yet. */
(() => {
  const m = location.pathname.match(/\/crew\/([^/]+)\/$/) || location.pathname.match(/\/crew\/([^/]+)\/index\.html$/);
  if (!m || m[1] === 'match' || document.querySelector('.fit')) return;
  const slug = m[1];
  const TEST = true;
  const base = document.documentElement.dataset.base || '';
  const crew = (Array.isArray(window.JB_CREW) ? window.JB_CREW : Object.values(window.JB_CREW || {})).find((c) => c.slug === slug);
  const after = document.querySelector('section.wearing');
  if (!crew || !crew.wear || !crew.wear.length || !after) return;

  // add-ons, from tools/crew_data.py MERCH (id: name, price, store slug)
  const ITEMS = {
    1310: ['Signature bucket hat, red', 39, 'bucket-hat-4'], 7426: ['Pop-art reversible bucket, Sativa', 43, 'reversible-bucket-hat-ny-drop-1-sativa-style-graphic'],
    6752: ['All-over snapback, Hybrid', 50, 'hat-hybrid'], 7570: ['NY Drop 1 classic tee, Hybrid', 35, 'classic-tee-ny-drop-1-hybrid-style'],
    1070: ['Signature tee, red script', 35, 'jerome-baker-indica-inline-logo'], 252: ["Men's pop-art high top, Sativa", 89, 'jb-sativa-mens-high-top-canvas-shoes-pop-art'],
    1302: ['Luchador backpack, Hybrid', 69, 'backpack-5'], 667: ['Pop-art flip flops, Sativa', 29, 'jb-sativa-flip-flops-pop-art'],
  };
  const HAT = /hat|bucket|snapback/i, TOP = /tee|polo|hoodie|crop/i, SHOE = /high top|flip flop|sneaker/i;
  const item = (id) => ({ id: +id, name: ITEMS[id][0], price: ITEMS[id][1], slug: ITEMS[id][2] });
  const worn = crew.wear.map((w) => ({ id: w.id, name: w.name, price: w.price, slug: w.slug }));
  const has = (re, list) => list.some((x) => re.test(x.name));
  const notIn = (list, cands) => cands.map(item).find((c) => !list.some((x) => x.id === c.id));

  // The fit: what they wear + the missing piece (a hat, or a tee, or flip flops). Full fit: + shoes (or a backpack).
  const fit = [...worn];
  fit.push(!has(HAT, fit) ? notIn(fit, [7426, 1310, 6752]) : !has(TOP, fit) ? notIn(fit, [7570, 1070]) : notIn(fit, [667]));
  const full = [...fit];
  full.push(!has(SHOE, full) ? notIn(full, [252]) : notIn(full, [1302]));
  const tiers = [
    { key: 'one', title: 'Just the ' + worn[0].name.split(',')[0].toLowerCase(), list: [worn[0]], off: 0 },
    { key: 'fit', title: 'The fit', list: fit.filter(Boolean), off: 0.15, pick: true },
    { key: 'full', title: 'Full fit', list: full.filter(Boolean), off: 0.12 },
  ];

  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const track = (ev, data) => { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev, page: 'crew', who: slug, test: TEST }, data)); };
  const code = (k) => (TEST ? 'TEST-' : '') + 'FIT-' + slug.replace(/[^a-z]/g, '').slice(0, 6).toUpperCase() + '-' + k.toUpperCase();

  const card = (t) => {
    const sum = t.list.reduce((s, x) => s + x.price, 0);
    const price = Math.round(sum * (1 - t.off));
    const save = sum - price;
    // dollars read better than percent on bigger tickets, so show the saving in dollars
    return `<article class="fit-tier${t.pick ? ' pick' : ''}" data-k="${t.key}">` +
      (t.pick ? `<p class="fit-flag">${esc(crew.name)}'s pick</p>` : '') +
      `<h3>${esc(t.title)}</h3>` +
      `<p class="fit-price"><b>${money(price)}</b>${save ? `<span>${money(sum)} separately · save ${money(save)}</span>` : '<span>&nbsp;</span>'}</p>` +
      `<ul>${t.list.map((x) => `<li><a href="${base}shop/#p=${esc(x.slug)}">${esc(x.name)}</a> <small>${money(x.price)}</small></li>`).join('')}</ul>` +
      `<button type="button" class="fit-go">${t.off ? 'Get ' + esc(t.title.toLowerCase()) : 'Get it'}</button>` +
      `<p class="fit-code" hidden></p></article>`;
  };
  const sec = document.createElement('section');
  sec.className = 'fit pad';
  sec.innerHTML = `<div class="wrap"><h2 class="display">Get the fit.</h2>` +
    `<p class="fit-lede">Dress like ${esc(crew.name)}. The more of the fit you take, the less each piece costs.</p>` +
    `<div class="fit-row">${tiers.map(card).join('')}</div>` +
    (TEST ? '<p class="fit-test">Test mode: bundle codes are not valid at checkout yet.</p>' : '') + `</div>`;
  after.after(sec);

  sec.querySelectorAll('.fit-tier').forEach((el) => {
    const t = tiers.find((x) => x.key === el.dataset.k);
    el.querySelector('.fit-go').addEventListener('click', () => {
      const out = el.querySelector('.fit-code');
      if (t.off) {
        const c = code(t.key);
        navigator.clipboard?.writeText(c).catch(() => {});
        out.innerHTML = `Code <b>${esc(c)}</b> copied. Add each piece, then use the code at checkout. ` +
          `<a href="${base}shop/#p=${esc(t.list[0].slug)}">Start with the ${esc(t.list[0].name.split(',')[0].toLowerCase())} →</a>`;
        out.hidden = false;
      } else location.href = base + 'shop/#p=' + t.list[0].slug;
      track('bundle_click', { tier: t.key, items: t.list.map((x) => x.id) });
    });
  });
  // count it as seen once it's on screen
  new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { track('bundle_view', {}); io.disconnect(); } }, { threshold: 0.4 }).observe(sec);
})();
