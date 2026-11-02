/* Crew promos: now and then a crew member walks in holding a sign or a golden ticket.
   Rules (David, 2026-11-02; see ~/.claude/skills/buyable/references/jb.md):
   - golden ticket: 15-25% off glass, earned by repeat visits or long time on site; giant bongs excluded
   - glass with merch: 10% off glass with a merch order; the only offer that touches giant bongs
     ("up to $4,000 off" = 10% of The Alien)
   - crew pick: 15% off something a crew member is wearing
   Up to 3 offers a session, 60s apart, timed to when attention slips or they look like they're leaving
   (idle after activity, fast scroll back up, desktop exit intent, tab return, product hesitation). Never in the first 30s; one tap to dismiss;
   two dismissals in a row ends offers for the session. Not loaded on the Travel Guide or comics.
   TEST MODE: codes are made here, start with TEST-, and touch no store. Real codes come from jbd-glass at go-live.
   Review hooks: ?promo=golden|glass|crew forces one now, ?promo=reset clears this browser's state. */
(() => {
  if (window.JBPromo) return;
  const TEST = true;
  const base = document.documentElement.dataset.base || '';
  const path = location.pathname;
  const here = /\/glass\//.test(path) ? 'glass' : /\/shop\//.test(path) ? 'shop' : /\/crew\/match\//.test(path) ? 'match'
    : /\/crew\/([^/]+)\//.test(path) ? 'crew' : /\/(travel|comics)\//.test(path) ? 'off' : 'home';
  if (here === 'off') return;
  // While codes are TEST codes, real visitors on the live site never see promos. Reviewers opt in once with
  // ?promo=on (or any ?promo=<kind>), which this browser remembers; ?promo=off opts back out.
  const optIn = (() => {
    const v = new URLSearchParams(location.search).get('promo');
    try {
      if (v === 'off') localStorage.removeItem('jbpromo-preview');
      else if (v) localStorage.setItem('jbpromo-preview', '1');
      return localStorage.getItem('jbpromo-preview') === '1';
    } catch (e) { return !!v && v !== 'off'; }
  })();
  // (the live-site switch is off: David wants the test promos visible to everyone, 2026-11-02)
  let off = false;
  try { off = localStorage.getItem('jbpromo-off') === '1'; if (new URLSearchParams(location.search).get('promo') === 'off') { localStorage.setItem('jbpromo-off', '1'); off = true; } else if (new URLSearchParams(location.search).get('promo')) localStorage.removeItem('jbpromo-off'); } catch (e) { /* */ }
  if (off) return;
  window.JBPromoPreview = optIn;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- tracking (this browser only, no personal data) ----------
  const KEY = 'jbpromo';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode: the offer just won't remember */ } };
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  const q = new URLSearchParams(location.search).get('promo');
  if (q === 'reset') { try { localStorage.removeItem(KEY); sessionStorage.removeItem('jbpromo-sess'); sessionStorage.removeItem('jbpromo-t0'); } catch (e) { /* */ } }
  const st = Object.assign({ visits: 0, last: 0, dwell: 0, seen: {}, wallet: [] }, load());
  const now = Date.now();
  if (now - st.last > 30 * 60e3) st.visits += 1; // a new visit after 30 minutes away
  st.last = now;
  st.wallet = st.wallet.filter((t) => t.exp > now);
  save();
  if (!ss('jbpromo-t0')) ss('jbpromo-t0', String(now));
  const sessionAge = () => Date.now() - Number(ss('jbpromo-t0') || now);

  const track = (ev, data) => {
    const row = Object.assign({ event: ev, page: here, test: TEST }, data);
    (window.dataLayer = window.dataLayer || []).push(row);
    if (window.JBTrack) window.JBTrack(ev, row); else console.debug('[JBPromo]', ev, row);
  };

  // time on site counts only while the tab is visible
  let tick = Date.now();
  setInterval(() => {
    const t = Date.now();
    if (document.visibilityState === 'visible') { st.dwell += t - tick; save(); }
    tick = t;
  }, 5000);

  // ---------- who can hold the sign ----------
  const CREW = {
    torch: ['Torch', 'lion', '#DA2342'], 'lunar-larry': ['Lunar Larry', 'chimp', '#2A3B8E'], chomps: ['Chomps', 'shark', '#05B48F'],
    ocho: ['Ocho', 'octo', '#FDB514'], 'dj-rivets': ['DJ Rivets', 'bot', '#05B48F'], 'sticky-ricky': ['Sticky Ricky', 'bear', '#FDB514'],
    'big-bill': ['Big Bill', 'toucan', '#DA2342'], crude: ['Crude', 'crude', '#0A0A0A'], beamer: ['Beamer', 'alien', '#05B48F'],
    'mama-cobra': ['Mama Cobra', 'cobra', '#05B48F'], 'big-stitch': ['Big Stitch', 'gorilla', '#0A0A0A'], gourdo: ['Gourdo', 'pumpkin', '#FDB514'],
    gutterball: ['Gutterball', 'dillo', '#2A3B8E'], speedbump: ['Speedbump', 'turtle', '#05B48F'], 'dr-squint': ['Dr. Squint', 'cy', '#DA2342'],
    mouthy: ['Mouthy', 'grin', '#DA2342'],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const crewList = () => (Array.isArray(window.JB_CREW) ? window.JB_CREW : Object.values(window.JB_CREW || {}));
  const wearOf = (slug) => (crewList().find((c) => c.slug === slug) || {}).wear || [];

  // The Alien: the uranium giant bong the "up to $4,000" headline is pinned to
  const ALIEN = { id: 'JBD-30A28BA0570D', price: 40000 };
  const alienLive = () => {
    const p = window.JB_GLASS && window.JB_GLASS.pieces && window.JB_GLASS.pieces.find((x) => x.id === ALIEN.id);
    if (!p) return ALIEN.price; // not on this page: last known price (re-check at go-live)
    return p.status === 'available' ? p.price : 0;
  };
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

  // ---------- offers ----------
  const code = (tag) => (TEST ? 'TEST-' : '') + tag + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const H = 3600e3;
  const OFFERS = {
    golden() {
      const pct = pick([15, 15, 15, 20, 20, 25]);
      const who = pick(['torch', 'mama-cobra', 'mouthy', 'crude', 'big-bill']);
      return {
        kind: 'golden', who, pct, hours: 48, tag: 'GOLD' + pct,
        kicker: 'Golden ticket', big: pct + '% off', line: 'any glass on the shelf. Giant bongs excluded.',
        say: 'You keep coming back. ' + CREW[who][0] + ' noticed.',
        cta: ['Pick your glass', base + 'glass/'],
      };
    },
    glass() {
      const off = alienLive() * 0.10;
      return {
        kind: 'glass', who: 'beamer', pct: 10, hours: 72, tag: 'GLASS10',
        kicker: 'Merch unlocks glass', big: '10% off glass', line: off ? 'with any merch order. Up to ' + money(off) + ' off The Alien.' : 'with any merch order.',
        say: off ? 'Up to ' + money(off) + ' off. I glow green under UV. Just saying.' : 'Grab a tee, take 10% off the glass.',
        cta: ['Shop merch', base + 'shop/'], alt: off ? ['See The Alien', base + 'glass/#p=' + ALIEN.id] : null,
      };
    },
    crew(slug) {
      const choices = slug && CREW[slug] && wearOf(slug).length ? [slug] : Object.keys(CREW).filter((s) => wearOf(s).length);
      if (!choices.length) return null;
      const who = pick(choices);
      const item = pick(wearOf(who));
      return {
        kind: 'crew', who, pct: 15, hours: 24, tag: who.replace(/[^a-z]/g, '').slice(0, 6).toUpperCase() + '15',
        kicker: CREW[who][0] + "'s pick", big: '15% off', line: 'the ' + item.name.toLowerCase() + ' ' + CREW[who][0] + ' is wearing.',
        say: pick(['Wear what I wear. Today only.', 'It looks better on you. Barely.', 'I am not giving this deal twice.']),
        cta: ['Get the ' + item.name.split(',')[0].toLowerCase(), base + 'shop/#p=' + item.slug], item: item.id,
      };
    },
  };

  // earned: 3+ visits or 8+ minutes on site, and not more than once every 3 days
  const goldenEarned = () => (st.visits >= 3 || st.dwell >= 8 * 60e3) && Date.now() - (st.seen.golden || 0) > 72 * H;
  const cool = (k, hours) => Date.now() - (st.seen[k] || 0) > hours * H;

  // ---------- the scene ----------
  let open = null;
  let onPromoEnd = () => {};
  const show = (o, why) => {
    if (!o || open) return;
    const [name, img, color] = CREW[o.who];
    const c = code(o.tag);
    const el = document.createElement('div');
    el.className = 'promo promo-' + o.kind + (reduce ? ' still' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', o.kicker + ': ' + o.big);
    el.style.setProperty('--c', color);
    el.innerHTML =
      `<button class="pr-x" type="button" aria-label="No thanks">×</button>` +
      `<img class="pr-who" src="${base}assets/crew/${img}_m.webp" alt="${name}" width="220" height="220">` +
      `<div class="pr-sign">` +
        `<p class="pr-kick">${o.kicker}</p><p class="pr-big">${o.big}</p><p class="pr-line">${o.line}</p>` +
        `<button class="pr-code" type="button" title="Copy code"><span>${c}</span><small>tap to copy</small></button>` +
        `<div class="pr-cta"><a class="pr-go" href="${o.cta[1]}">${o.cta[0]}</a>${o.alt ? `<a class="pr-alt" href="${o.alt[1]}">${o.alt[0]}</a>` : ''}</div>` +
        `<p class="pr-fine">${TEST ? 'TEST CODE, not valid at checkout yet. ' : ''}Good for ${o.hours} hours. One per customer.</p>` +
      `</div>` +
      `<p class="pr-say">${o.say}</p>`;
    document.body.appendChild(el);
    open = el;
    requestAnimationFrame(() => el.classList.add('in'));
    st.seen[o.kind] = Date.now(); save();
    track('promo_shown', { kind: o.kind, who: o.who, pct: o.pct, why });

    let copied = false;
    const keep = () => {
      copied = true;
      if (!st.wallet.some((t) => t.code === c)) {
        st.wallet.push({ code: c, kind: o.kind, pct: o.pct, big: o.big, line: o.line, go: o.cta, exp: Date.now() + o.hours * H });
        save(); wallet();
      }
    };
    const shut = (how) => {
      if (!open) return;
      el.classList.remove('in'); el.classList.add('out');
      setTimeout(() => el.remove(), reduce ? 0 : 450);
      open = null;
      removeEventListener('keydown', esc);
      track(how === 'claim' ? 'promo_claimed' : 'promo_dismissed', { kind: o.kind, who: o.who, pct: o.pct, how });
      onPromoEnd(copied ? 'copy' : how);
    };
    const esc = (e) => { if (e.key === 'Escape') shut('esc'); };
    addEventListener('keydown', esc);
    el.querySelector('.pr-x').addEventListener('click', () => shut('x'));
    el.querySelector('.pr-code').addEventListener('click', (e) => {
      keep();
      navigator.clipboard?.writeText(c).catch(() => {});
      e.currentTarget.querySelector('small').textContent = 'copied, saved to your tickets';
      track('promo_copied', { kind: o.kind });
    });
    el.querySelectorAll('.pr-go,.pr-alt').forEach((a) => a.addEventListener('click', () => { keep(); navigator.clipboard?.writeText(c).catch(() => {}); shut('claim'); }));
  };

  // the claimed tickets stay in a small stub at the corner until they expire
  const wallet = () => {
    let w = document.querySelector('.pr-wallet');
    const live = st.wallet.filter((t) => t.exp > Date.now());
    if (!live.length) { w?.remove(); return; }
    if (!w) { w = document.createElement('div'); w.className = 'pr-wallet'; document.body.appendChild(w); }
    const t = live[live.length - 1];
    const hrs = Math.max(1, Math.round((t.exp - Date.now()) / H));
    w.innerHTML = `<button type="button" class="pr-stub" aria-expanded="false"><b>${t.big}</b><span>${live.length > 1 ? live.length + ' tickets' : hrs + 'h left'}</span></button>` +
      `<div class="pr-list" hidden>${live.map((x) => `<div class="pr-item"><b>${x.big}</b> ${x.line}<button type="button" data-c="${x.code}">${x.code}</button><a href="${x.go[1]}">${x.go[0]} →</a></div>`).join('')}</div>`;
    const stub = w.querySelector('.pr-stub');
    const list = w.querySelector('.pr-list');
    stub.addEventListener('click', () => { list.hidden = !list.hidden; stub.setAttribute('aria-expanded', String(!list.hidden)); });
    list.querySelectorAll('button[data-c]').forEach((b) => b.addEventListener('click', () => { navigator.clipboard?.writeText(b.dataset.c).catch(() => {}); b.textContent = 'copied'; }));
  };
  wallet();

  // ---------- triggers: when attention slips or they look like they're leaving ----------
  // Up to 3 offers a session, 60s apart, each kind once; two dismissals in a row ends it for the session.
  const sess = () => { try { return JSON.parse(ss('jbpromo-sess')) || { kinds: [], last: 0, nos: 0 }; } catch (e) { return { kinds: [], last: 0, nos: 0 }; } };
  const sessSave = (o) => ss('jbpromo-sess', JSON.stringify(o));
  const forced = q && OFFERS[q] ? q : null; // ?promo=on just opts in, it doesn't force one
  const crewSlug = () => (path.match(/\/crew\/([^/]+)\//) || [])[1];
  const productId = () => { const m = location.hash.match(/^#p=(.+)$/); return m ? decodeURIComponent(m[1]) : null; };

  // what fits this page and moment, skipping kinds already shown this session or still cooling down
  const choose = () => {
    const done = sess().kinds;
    const ok = (k, h) => !done.includes(k) && cool(k, h);
    const id = productId();
    const list = [];
    if (!done.includes('golden') && goldenEarned()) list.push(['golden']);
    if (here === 'glass') {
      const p = id && (window.JB_GLASS?.pieces || []).find((x) => x.id === id);
      if (p && p.shelf === 'giant') list.unshift(['glass']); // a giant bong is open: the merch combo is the only deal on it
      list.push(['glass'], ['crew']);
    } else if (here === 'shop') {
      const wearer = id && Object.keys(CREW).find((s) => wearOf(s).some((w) => w.slug === id));
      if (wearer) list.push(['crew', wearer]);
      list.push(['glass'], ['crew']);
    } else if (here === 'crew') list.push(['crew', crewSlug()], ['glass']);
    else list.push(['crew'], ['glass']);
    const hours = { golden: 72, glass: 6, crew: 2 };
    return list.find(([k]) => k === 'golden' || ok(k, hours[k]));
  };

  let engaged = 0;       // interactions this page view
  let lastAct = Date.now();
  const fire = (why) => {
    const s = sess();
    if (open || s.kinds.length >= 3 || s.nos >= 2 || Date.now() - s.last < 60e3 || sessionAge() < 30e3) return;
    if (document.querySelector('dialog[open], .lightbox.on, .holo-full')) return; // don't interrupt a viewer
    const c = choose();
    if (!c) return;
    const o = OFFERS[c[0]](c[1]);
    if (!o) return;
    s.kinds.push(o.kind); s.last = Date.now(); sessSave(s);
    show(o, why);
  };
  onPromoEnd = (how) => { const s = sess(); s.nos = how === 'claim' || how === 'copy' ? 0 : s.nos + 1; sessSave(s); };

  if (forced) setTimeout(() => show(OFFERS[forced](here === 'crew' ? crewSlug() : undefined), 'forced'), 600);
  else {
    const act = () => { engaged++; lastAct = Date.now(); };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, act, { passive: true }));

    // 1. attention slips: they were active, then nothing for 12s (phone) / 15s (desktop) with the tab in view
    const idleMs = matchMedia('(pointer: coarse)').matches ? 12e3 : 15e3;
    setInterval(() => {
      if (engaged >= 3 && document.visibilityState === 'visible' && Date.now() - lastAct > idleMs) { engaged = 0; fire('idle'); }
    }, 2000);

    // 2. leaving: fast scroll back toward the top after reading down the page (phone's "I'm heading out")
    let y0 = scrollY, t0 = Date.now(), deepest = 0;
    addEventListener('scroll', () => {
      act();
      const y = scrollY, t = Date.now();
      deepest = Math.max(deepest, y);
      if (t - t0 > 250) {
        const v = (y0 - y) / (t - t0); // px/ms upward
        if (v > 2.2 && deepest > innerHeight * 1.5 && y < deepest * 0.5) { deepest = y; fire('scroll-up'); }
        y0 = y; t0 = t;
      }
    }, { passive: true });

    // 3. leaving on desktop: the mouse heads up out of the page toward the tabs / back button
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget && e.clientY <= 4) fire('exit-intent'); });

    // 4. they wandered off to another tab and came back
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 10e3) setTimeout(() => fire('came-back'), 1200);
    });

    // 5. hesitating on one product for 20s
    let lingerT = null;
    const watchProduct = () => {
      clearTimeout(lingerT);
      const h = location.hash;
      if (!productId()) return;
      lingerT = setTimeout(() => { if (location.hash === h) fire('product-linger'); }, 20e3);
    };
    addEventListener('hashchange', watchProduct);
    watchProduct();
  }

  window.JBPromo = { state: st, show: (k, a) => show(OFFERS[k](a), 'api'), track };
})();
