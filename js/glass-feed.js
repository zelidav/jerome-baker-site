/* Live glass feed. Pieces added in the JB app show up here with no rebuild and no deploy:
   .github/workflows/glass-feed.yml (tools/glass_feed.py) writes glass-feed.json + images to the `glass-feed` data
   branch every 15 minutes; this merges it into window.JB_GLASS (from js/glass-data.js, so load that first).
     - new pieces are added (their `img` says where their photos live; hand-cut pieces in glass-data.js win)
     - current status and price are applied to every piece, so a sale or price change shows without a rebuild
   The feed is a nicety: missing, slow (2.5s cap) or malformed, and the page is exactly what glass-data.js says.
   window.JBGlassFeed.ready resolves once the merge is done or given up, and never rejects.
   Pieces Jason adds from his phone (the app's /maker page) also come straight from the app's /api/gallery, so they
   are on the page the moment their photos are treated, with no wait for the 15-minute feed: those carry a `site`
   block (the treated image set the jb-maker-3d job wrote, flagged-word-safe name and description).
   window.JBGlassImg(piece, suffix, base) is the one place a glass photo URL is built:
     JBGlassImg(p, '_t', '../')  ->  <p.img or ../assets/glass/><id>_t.webp */
(() => {
  if (window.JBGlassFeed) return;
  const FEED = 'https://raw.githubusercontent.com/zelidav/jerome-baker-site/glass-feed/glass-feed.json';
  const RANK = { available: 0, sold: 1, collected: 2 };
  const APP = 'https://jbcustomer.cannacrypted.com';
  const MAKER_IMG = 'https://storage.googleapis.com/jbd-public-product-images/maker/';
  // tools/build_glass.py SHELVES (titles through tools/scrub.py), for a shelf the built page has no pieces on yet
  const SHELVES = [{"key":"maui","title":"Jason Harris Maui Originals","line":"Hand p!pes Jason makes in his Maui studio. Every marble is fumed, then encased in molten clear glass and folded, so the color moves through bands of changing iridescence. Ships from Maui."},{"key":"giant","title":"Giant b0ngs","line":"Four feet of glass and up, pulled by a team of fifteen. One of each, ever."},{"key":"le","title":"Limited Edition","line":"The crown pieces. Wig-wag, millies, knuckles and marbles, worked at the bench and signed off as one of one."},{"key":"og","title":"Original Series","line":"The fifteen-inch Baker silhouette that started it. Fumed bulb, straight tube, built to hit and built to last."},{"key":"second","title":"Second Life","line":"Worked tubes rebuilt into cork-top jars. Each one was something else first."},{"key":"keiki","title":"Keikis","line":"Small hand-blown b0ngs, each one worked a little differently. The NY Keiki Collection, plus the Jerome Baker Designs Keikis."},{"key":"studio","title":"Studio one-offs","line":"Rigs, calumets and showpieces off the bench, sold straight from the studio store."},{"key":"creatures","title":"Spirit Creatures","line":"Little sea animals worked in clear and color, each one numbered. Turtles, whales, octopus, starfish."},{"key":"daily","title":"Everyday glass","line":"The pieces you actually reach for. Beakers, tubes, jars, Clearboys and the Skeeter lunch boxes."},{"key":"kit","title":"B0wls, stems and kit","line":"The parts that keep a piece working. B0wls, downstems, tips, trays and the fix-it kit."}];
  const NO_SMOKE = /spirit creature|on burl|^cupid$|pendant|jar|skeeter/i;

  // one /api/gallery item with a treated `site` image set -> a glass-data piece
  const fromApp = (g) => {
    const s = g && g.site, id = g && g.provenance_id;
    if (!s || typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || s.img !== MAKER_IMG + id + '/site/') return null;
    const shelf = SHELVES.some((x) => x.key === g.site_shelf) ? g.site_shelf : 'daily';
    const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
    const pt = (v) => (Array.isArray(v) && v.length === 2 ? [num(v[0]), num(v[1])] : [0.5, 0.01]);
    const p = {
      id, name: String(s.name || ''), shelf, series: String(g.series || ''), shape: String(g.shape || ''),
      price: num(g.price), status: g.status === 'available' ? 'available' : g.status === 'sold' ? 'sold' : 'collected',
      online: !!g.online_sale, edition: String(g.edition || ''), standard: false, inches: 0, desc: String(s.desc || ''),
      buy: APP + '/buy/' + id, verify: APP + '/c/piece/' + id + '?prov=1', img: s.img,
      w: num(s.w), h: num(s.h), zw: num(s.zw), zh: num(s.zh), mouth: pt(s.mouth), base: pt(s.base), bw: num(s.bw),
    };
    if (!p.w || !p.h) return null;
    if (['creatures', 'second', 'kit'].includes(shelf) || NO_SMOKE.test(p.name)) p.smoke = false;
    return p;
  };
  const appFeed = (gallery) => {
    const pieces = (Array.isArray(gallery) ? gallery : []).map(fromApp).filter(Boolean);
    return { pieces, shelves: SHELVES.filter((x) => pieces.some((p) => p.shelf === x.key)), shelf_order: SHELVES.map((x) => x.key) };
  };

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
    const fresh = f.pieces.filter((p) => p && typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(p.id) && p.shelf && !have.has(p.id) && /^https:\/\//.test(p.buy || '') && /^https:\/\//.test(p.verify || '') && (!p.img || p.img.startsWith(FEED.slice(0, FEED.lastIndexOf('/') + 1)) || p.img === MAKER_IMG + p.id + '/site/'));
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

  // both sources in parallel, each capped at 2.5s; the app's own pieces merge first so their treated photos win
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
  const ready = (!window.JB_GLASS || !window.fetch) ? Promise.resolve() :
    Promise.all([get(APP + '/api/gallery'), get(FEED + '?t=' + Math.floor(Date.now() / 300000))]).then(([g, f]) => {
      try { if (g) merge(window.JB_GLASS, appFeed(g)); } catch (e) { /* page stays as built */ }
      try { if (f) merge(window.JB_GLASS, f); } catch (e) { /* page stays as built */ }
    });
  window.JBGlassFeed = { ready, merge };
})();
