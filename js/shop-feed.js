/* Live merch feed. Printify publishes to www.jeromebaker.shop; .github/workflows/shop-feed.yml (tools/shop_feed.py)
   writes shop-feed.json to the `shop-feed` data branch every 15 minutes, and this lays it over window.JBShop
   (from js/shop-data.js, so load that first). New products, price changes, new copy and sold-out sizes show with no
   rebuild and no deploy. Items from jeromebakerny.com and from jeromebaker.com stay exactly as built.
   The feed is a nicety: missing, slow (2.5s cap) or malformed, and the page is what shop-data.js says.
   window.JBShopFeed.ready resolves once the merge is done or given up, and never rejects. */
(() => {
  if (window.JBShopFeed) return;
  const FEED = 'https://raw.githubusercontent.com/zelidav/jerome-baker-site/shop-feed/shop-feed.json';
  const STORE = 'https://www.jeromebaker.shop';
  const isShop = (p) => p && p.shop === 'shopify' && p.store === STORE;
  const ok = (p) => p && Number.isInteger(p.id) && typeof p.name === 'string' && typeof p.slug === 'string' && p.slug.startsWith('shp-') &&
    typeof p.price === 'number' && isFinite(p.price) && Array.isArray(p.imgs) && p.imgs.length && p.imgs.every((u) => /^https:\/\/cdn\.shopify\.com\//.test(u)) &&
    typeof p.url === 'string' && p.url.startsWith(STORE + '/') && Array.isArray(p.variations) && Array.isArray(p.attrs) && p.store === STORE;

  const merge = (D, f) => {
    if (!D || !Array.isArray(D.items) || !f || !Array.isArray(f.items)) return;
    const fresh = f.items.filter(ok);
    if (fresh.length < 5 || fresh.length < f.items.length * 0.9) return; // a thin or damaged feed never replaces the shelf
    const have = new Set(fresh.map((p) => p.id));
    // keep the built crew pick for a product that was already on the page
    const prev = new Map(D.items.filter(isShop).map((p) => [p.id, p]));
    fresh.forEach((p) => { const b = prev.get(p.id); if (b && b.crew && D.crew[b.crew]) p.crew = b.crew; if (!D.crew[p.crew]) p.crew = Object.keys(D.crew)[0]; });
    D.items = D.items.filter((p) => !isShop(p) || have.has(p.id)).filter((p) => !have.has(p.id)).concat(fresh);
  };

  const get = (url) => new Promise((done) => {
    try {
      const ac = window.AbortController ? new AbortController() : null;
      const timer = setTimeout(() => { if (ac) ac.abort(); done(null); }, 2500);
      fetch(url, ac ? { signal: ac.signal } : {})
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { clearTimeout(timer); done(j); })
        .catch(() => { clearTimeout(timer); done(null); });
    } catch (e) { done(null); }
  });
  const ready = (!window.JBShop || !window.fetch) ? Promise.resolve() :
    get(FEED + '?t=' + Math.floor(Date.now() / 300000)).then((f) => { try { if (f) merge(window.JBShop, f); } catch (e) { /* page stays as built */ } });
  window.JBShopFeed = { ready, merge };
})();
