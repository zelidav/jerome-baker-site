/* Live glass feed. Pieces added in the JB app show up here with no rebuild and no deploy:
   .github/workflows/glass-feed.yml (tools/glass_feed.py) writes glass-feed.json + images to the `glass-feed` data
   branch every 15 minutes; this merges it into window.JB_GLASS (from js/glass-data.js, so load that first).
     - new pieces are added (their `img` says where their photos live; hand-cut pieces in glass-data.js win)
     - current status and price are applied to every piece, so a sale or price change shows without a rebuild
   The feed is a nicety: missing, slow (2.5s cap) or malformed, and the page is exactly what glass-data.js says.
   window.JBGlassFeed.ready resolves once the merge is done or given up, and never rejects.
   window.JBGlassImg(piece, suffix, base) is the one place a glass photo URL is built:
     JBGlassImg(p, '_t', '../')  ->  <p.img or ../assets/glass/><id>_t.webp */
(() => {
  if (window.JBGlassFeed) return;
  const FEED = 'https://raw.githubusercontent.com/zelidav/jerome-baker-site/glass-feed/glass-feed.json';
  const RANK = { available: 0, sold: 1, collected: 2 };

  window.JBGlassImg = (p, suffix, base) => ((p && p.img) || (base || '') + 'assets/glass/') + p.id + (suffix || '') + '.webp';

  const merge = (D, f) => {
    if (!D || !Array.isArray(D.pieces) || !f || !Array.isArray(f.pieces)) return;
    const have = new Set(D.pieces.map((p) => p.id));
    const st = f.status || {};
    D.pieces.forEach((p) => {
      const s = st[p.id];
      if (!s) return;
      if (RANK[s.status] !== undefined) p.status = s.status;
      if (typeof s.price === 'number') p.price = s.price;
    });
    const fresh = f.pieces.filter((p) => p && typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(p.id) && p.shelf && !have.has(p.id) && /^https:\/\//.test(p.buy || '') && /^https:\/\//.test(p.verify || '') && (!p.img || p.img.startsWith(FEED.slice(0, FEED.lastIndexOf('/') + 1))));
    if (!fresh.length && !Object.keys(st).length) return;
    fresh.forEach((p) => D.pieces.push(p));
    const shelves = D.shelves || (D.shelves = []);
    (f.shelves || []).forEach((s) => { if (!shelves.some((x) => x.key === s.key)) shelves.push(s); });
    const order = f.shelf_order || [];
    const at = (k) => { const i = order.indexOf(k); return i < 0 ? 99 : i; };
    shelves.sort((a, b) => at(a.key) - at(b.key));
    const sh = (k) => { const i = shelves.findIndex((s) => s.key === k); return i < 0 ? 99 : i; };
    // the same order tools/build_glass.py writes: shelf, available first, dearest first, name
    D.pieces.sort((a, b) => sh(a.shelf) - sh(b.shelf) || (RANK[a.status] ?? 2) - (RANK[b.status] ?? 2) ||
      b.price - a.price || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  };

  const ready = new Promise((done) => {
    try {
      if (!window.JB_GLASS || !window.fetch) return done();
      const ac = window.AbortController ? new AbortController() : null;
      const timer = setTimeout(() => { if (ac) ac.abort(); done(); }, 2500);
      fetch(FEED + '?t=' + Math.floor(Date.now() / 300000), ac ? { signal: ac.signal } : {})
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((f) => { clearTimeout(timer); try { merge(window.JB_GLASS, f); } catch (e) { /* page stays as built */ } done(); })
        .catch(() => { clearTimeout(timer); done(); });
    } catch (e) { done(); }
  });
  window.JBGlassFeed = { ready, merge };
})();
