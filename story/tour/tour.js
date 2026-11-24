/* The way back: scroll-driven tour. One sticky stage per chapter, a camera that zooms into the page, captions that float up,
   a loupe, clickable old links, and the November 2026 finale. Data: data.js (chapters), regions.js (zoom regions + links), extras.js. */
(function () {
  'use strict';
  const D = window.JB_HISTORY, R = window.JB_REGIONS || {}, X = window.JB_EXTRAS || { captures: {}, wb: {} };
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mob = () => innerWidth <= 860;
  const coarse = matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const S = 0.85;                       // scroll length of one beat, in screens
  const HOLD = 0.58;                    // share of a beat the camera holds before it moves on
  const ACC = { t98: '#ff2a2a', t00: '#4fb0ff', t01: '#FDB514', t02: '#05B48F', t03: '#DA2342', t06: '#FFF100', tdark: '#555', t16: '#FFF100', t19: '#2A3B8E', t22: '#DA2342', tnow: '#FFF100' };
  const SPAN = { 'order-line': [1998.9, 2000.0], graffiti: [2000.0, 2001.0], peak: [2001.0, 2002.0], landing: [2002.0, 2003.6], restrained: [2003.6, 2006.0],
    decks: [2006.6, 2008.0], dark: [2013.0, 2016.4], lion: [2016.4, 2019.0], history: [2019.0, 2022.0], nft: [2022.0, 2023.2], now: [2026.0, 2027.0] };
  const Y0 = 1998, Y1 = 2027.2;
  const main = $('#tour');
  let VH = innerHeight;

  // ---------- helpers on the archive data ----------
  const norm = (u) => String(u).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/:80(?=\/|$)/, '').replace(/[#?].*$/, '').replace(/\/index\d?\.html?$/i, '/').toLowerCase();
  const yearOf = (ts) => +ts.slice(0, 4) + (+ts.slice(4, 6) - 1) / 12;
  const byPage = new Map();             // normalised page URL -> beats that show it
  const frame = (b) => {
    const r = R[b.img];
    if (r) return { src: r.img, ar: r.h / r.w, regions: r.regions, links: r.links, pins: r.pins, ts: b.ts, page: r.page };
    const ar = b.h / b.w;
    return { src: b.img, ar, regions: ar > 1.4 ? [{ x: 0, y: 28, w: 100, h: 22, kind: 'more', text: '', alt: '' }] : [], links: [], pins: [], ts: b.ts, page: 'http://' + b.url };
  };
  const archiveUrl = (b, fi) => X.wb[b.img] || ('https://web.archive.org/web/' + b.ts + '/' + fi.page);
  const linkUrl = (href, ts) => 'https://web.archive.org/web/' + ts + '/' + href;

  // old link -> the page that does that job on the new site (null = leave it pointing at the archive)
  const LIVE = [
    [/wholesale/, '../../wholesale/', 'Wholesale'],
    [/contact|email|mailto/, '../../contact/', 'Contact'],
    [/privacy|terms|merchant|policy/, '../../privacy/', 'Privacy'],
    [/returns/, '../../returns/', 'Returns'],
    [/about-us|history|jbdnews|informer|lounge|phreak|chat\.|links\.html|forum|tubetalk|glassifieds|gal2|on tour|locations/, '../', 'The story'],
    [/shop|cart|search|apparel|headwear|skate|sticker|collections\/(apparel|smoking|calumets)|category|glitter|pouch|sleeve/, '../../shop/', 'Ritual Merch'],
    [/tube|water|pipe|bubbl|slide|gallery|gal\.|prlst|price|hdpcs|access|artwork|art_gal|a-series|limited|sidecar|calumet|collections/, '../../glass/', 'Glass'],
    [/homepage|jbd\.html|^[a-z.]*jeromebaker\.com\/?$|^web\.archive\.org\/?$/, '../../', 'Home']
  ];
  function liveFor(l) {
    const h = (l.href || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/:80(?=\/|$)/, '').replace(/[#?].*$/, '');
    if (/^(disney|ghettoweb)\./.test(h)) return null;
    const t = h.replace(/^web\.archive\.org\//, 'web.archive.org/') + ' ' + (l.label || '').toLowerCase();
    for (const r of LIVE) if (r[0].test(t) || r[0].test(h)) return { href: r[1], name: r[2] };
    return null;
  }

  // ---------- build ----------
  const chapters = [];                  // generic stage chapters
  const moments = [];                   // every overview step, in order (for the stepper and link jumps)
  let nMoment = 0;

  function regionsFor(fi) {
    const rs = fi.regions || [];
    const photo = rs.find((r) => r.kind === 'photo');
    const texts = rs.filter((r) => r.kind === 'text').sort((a, b) => a.y - b.y);
    const more = rs.find((r) => r.kind === 'more');
    const z1 = photo || texts[0] || more;
    const out = [];
    if (z1) out.push(z1);
    if (fi.ar > 1.9) {
      const other = [...rs].filter((r) => r !== z1).sort((a, b) => b.y - a.y)[0];
      if (other) out.push(other);
    }
    return out;
  }

  function stepsFor(beats, live) {
    const steps = [];
    beats.forEach((b) => {
      const fi = b.fi || frame(b);
      b.fi = fi;
      const mi = b.mi != null ? b.mi : nMoment++;
      const ov = { type: 'ov', b, fi, mi, key: fi.src, region: null };
      steps.push(ov);
      moments.push(ov);
      if (!live) {
        regionsFor(fi).forEach((r) => steps.push({ type: 'zoom', b, fi, mi, key: fi.src, region: r }));
      }
    });
    return steps;
  }

  function cardHtml(st, side) {
    const b = st.b, fi = st.fi;
    let k, body, act = '', note = '';
    if (st.type === 'ov') {
      k = b.date;
      body = '<p>' + esc(b.cap) + '</p>';
      if (b.live) {
        act = '<a href="' + esc(b.live) + '">Open this page &#8599;</a>';
      } else {
        const n = fi.links.length;
        act = '<a href="' + esc(archiveUrl(b, fi)) + '" target="_blank" rel="noopener">archive.org &#8599;</a><button type="button" data-full="' + esc(fi.src) + '" data-cap="' + esc(b.date + '. ' + b.url) + '" data-b="' + b.mi + '">Browse the old page</button>';
        if (n) note = '<div class="note">' + n + ' of the old links on this page still work. Hover or tap them. Press L to outline them.</div>';
        if (fi.pins.length) note += '<div class="note">' + fi.pins.length + (fi.pins.length > 1 ? ' pictures were' : ' picture was') + ' never saved by the archive. The yellow boxes are close stand-ins, not the originals.</div>';
      }
    } else if (st.region.kind === 'text') {
      k = 'The page said';
      body = '<p class="q">&ldquo;' + esc(st.region.text.replace(/\s+/g, ' ').trim()) + (st.region.text.length >= 255 ? '&hellip;' : '') + '&rdquo;</p>';
    } else if (st.region.kind === 'photo') {
      k = 'A closer look';
      body = '<p>' + (st.region.alt ? 'The page called this picture &ldquo;' + esc(st.region.alt) + '&rdquo;.' : 'Zoomed in on the picture at the top of the page.') + '</p>';
    } else {
      k = 'Keep going';
      body = '<p>Further down the same page.</p>';
    }
    return '<span class="k">' + esc(k) + '</span>' + body + (act ? '<div class="act">' + act + '</div>' : '') + note;
  }

  function buildChapter(c, opts) {
    opts = opts || {};
    const live = !!opts.live;
    const sec = el('section', 'ch ' + c.theme);
    sec.id = c.id;
    const stage = el('div', 'stage');
    stage.appendChild(el('div', 'dots'));
    const ghost = el('div', 'ghost', esc(opts.ghost || String(c.years).slice(0, 4)));
    stage.appendChild(ghost);
    const screen = el('div', 'screen');
    const chrome = el('div', 'chrome');
    chrome.innerHTML = '<span class="lights"><i></i><i></i><i></i></span><span class="url"></span><span class="when"></span>' +
      (live ? '<a class="tb open" target="_self"><span class="lbl2">Open </span>&#8599;</a>' :
        '<a class="tb wb" target="_blank" rel="noopener" title="Open this exact capture on archive.org">archive.org &#8599;</a>' +
        '<button type="button" class="tb-links" aria-pressed="false" title="Outline the old links (L)">Links</button>' +
        '<button type="button" class="tb-pins" aria-pressed="true" title="Show or hide stand-ins">Stand-ins</button>' +
        '<button type="button" class="tb-loupe" aria-pressed="true" title="Magnifier (M)">Loupe</button>');
    const view = el('div', 'view');
    const pill = el('a', 'srcpill'); pill.target = '_blank'; pill.rel = 'noopener'; view.appendChild(pill);
    screen.append(chrome, view);
    const cards = el('div', 'cards');
    const intro = el('div', 'intro', '<p class="yrs">' + esc(c.years) + '</p><h2>' + esc(c.title) + '</h2><p>' + esc(c.lede) + '</p>');
    stage.append(screen, cards, intro);
    sec.appendChild(stage);

    const steps = stepsFor(c.beats, live);
    const layers = new Map();
    steps.forEach((st, i) => {
      st.j = i + 1;
      st.side = i % 2 ? 'l' : 'r';
      const card = el('div', 'card ' + st.side, cardHtml(st, st.side));
      cards.appendChild(card);
      st.card = card;
      if (!layers.has(st.key)) {
        const fi = st.fi;
        const L = el('div', 'layer');
        const img = new Image();
        img.alt = 'jeromebaker.com as the archive saved it, ' + st.b.date;
        img.decoding = 'async';
        img.loading = chapters.length < 2 ? 'eager' : 'lazy';
        if (live) {
          img.src = st.b.src;
          img.dataset.m = st.b.srcM;
        } else {
          img.src = fi.src;
        }
        L.appendChild(img);
        const ov = el('div', 'ov');
        ov.style.cssText = 'position:absolute;inset:0';
        (live ? [{ x: 0, y: 0, w: 100, h: 100, href: st.b.live, label: 'Open this page', live: true }] : fi.links).forEach((l, n) => {
          const a = el('a', 'hs');
          a.style.cssText = 'left:' + l.x + '%;top:' + l.y + '%;width:' + l.w + '%;height:' + l.h + '%';
          a.dataset.label = l.label || '';
          const lv = !l.live && liveFor(l);
          if (lv) { a.href = lv.href; a.target = '_blank'; a.dataset.nl = lv.name; a.classList.add('nl'); } else if (l.live) { a.href = l.href; a.dataset.live = '1'; } else {
            const hit = byPage.get(norm(l.href));
            if (hit) {
              const best = hit.reduce((p, q) => (Math.abs(+q.ts.slice(0, 8) - +fi.ts.slice(0, 8)) < Math.abs(+p.ts.slice(0, 8) - +fi.ts.slice(0, 8)) ? q : p));
              if (best.fi !== fi && best.mi != null) { a.dataset.go = best.mi; a.href = '#m' + best.mi; a.dataset.to = best.date + (best.cap ? '' : ''); }
            }
            if (!a.getAttribute('href')) { a.href = linkUrl(l.href, fi.ts); a.target = '_blank'; a.rel = 'noopener'; }
          }
          ov.appendChild(a);
        });
        fi.pins.forEach((p) => {
          const d = el('div', 'pin');
          d.style.cssText = 'left:' + p.x + '%;top:' + p.y + '%;width:' + p.w + '%;height:' + p.h + '%';
          d.dataset.note = p.note; d.dataset.chip = p.chip;
          d.innerHTML = '<b>' + (p.w >= 13 ? 'stand-in' : '&#8776;') + '</b>';
          ov.appendChild(d);
        });
        L.appendChild(ov);
        view.appendChild(L);
        layers.set(st.key, { el: L, img, fi, ar: fi.ar, arM: live ? st.b.arM : fi.ar });
      }
    });
    main.appendChild(sec);
    const ch = { c, sec, stage, ghost, screen, chrome, view, cards, intro, steps, layers, nseg: steps.length + 1, live, W: 0, H: 0, cams: [], cur: null, hasPins: steps.some((s) => s.fi.pins.length) };
    if (!ch.hasPins && !live) { const b = $('.tb-pins', chrome); if (b) b.style.display = 'none'; }
    if (!steps.some((s) => s.fi.links.length) && !live) { const b = $('.tb-links', chrome); if (b) b.style.display = 'none'; }
    chapters.push(ch);
    return ch;
  }

  // ---------- interludes ----------
  const inters = [];
  function addPull(c, theme) {
    if (!c.quote) return;
    const s = el('section', 'pull ' + theme);
    const p = el('p');
    c.quote[0].split(/\s+/).forEach((w) => { const sp = el('span', null, esc(w) + ' '); p.appendChild(sp); });
    s.append(p, el('footer', null, esc(c.quote[1])));
    main.appendChild(s);
    inters.push({ type: 'pull', sec: s, words: [...p.children] });
  }
  function addReel(c) {
    const reel = D.reel || [];
    if (!reel.length) return;
    const sec = el('section', 'inter reel t01');
    sec.id = 'piece-of-the-week';
    const stage = el('div', 'stage');
    stage.appendChild(el('div', 'dots'));
    stage.appendChild(el('h3', null, 'Piece of the Week,<br>autumn 2001'));
    const tr = el('div', 'track');
    reel.forEach((p, i) => {
      const b = el('button');
      b.type = 'button';
      b.style.setProperty('--r', (i % 2 ? 1.6 : -1.6) + 'deg');
      b.innerHTML = '<img src="' + p.img + '" alt="A glass piece from the 2001 Piece of the Week archive" loading="lazy" decoding="async">';
      b.addEventListener('click', () => openLb(p.img, 'Piece of the Week, autumn 2001'));
      tr.appendChild(b);
    });
    stage.appendChild(tr);
    stage.appendChild(el('p', 'cap', 'A new piece every Monday, shot straight on black. Tap one to see it big.'));
    sec.appendChild(stage);
    main.appendChild(sec);
    inters.push({ type: 'reel', sec, track: tr, h: 2.4 });
  }
  function addDark(c) {
    const sec = el('section', 'inter dark tdark');
    sec.id = c.id;
    const stage = el('div', 'stage');
    stage.innerHTML = '<div class="scan"></div><h3>The dark years</h3><div class="big" id="darkYear">2013</div><p>' + esc(c.lede) + '</p>';
    sec.appendChild(stage);
    main.appendChild(sec);
    inters.push({ type: 'dark', sec, big: $('#darkYear', stage), h: 2.2, c });
  }

  // ---------- finale ----------
  const CREW = ['lion', 'alien', 'bot', 'gorilla', 'chimp', 'toucan', 'devil', 'octo', 'shark', 'cobra', 'grin', 'mrx'];
  function addFinale() {
    const hero = el('section', 'inter fin fin-hero');
    hero.id = 'now';
    const stage = el('div', 'stage');
    const fx = el('div', 'crewfx');
    const specs = [[4, 14, 190, -10, .5], [78, 8, 210, 8, .9], [88, 58, 180, -6, .6], [10, 62, 220, 12, 1.1], [44, 74, 170, -4, .7], [62, 20, 150, 6, 1.3], [26, 8, 140, -14, .8], [70, 70, 200, 10, .55]];
    specs.forEach((s, i) => {
      const im = new Image();
      im.src = '../../assets/crew/' + CREW[i % CREW.length] + '_m.webp';
      im.alt = '';
      im.style.cssText = 'left:' + s[0] + '%;top:' + s[1] + '%;width:' + (mob() ? s[2] * .55 : s[2]) + 'px;rotate:' + s[3] + 'deg';
      im.dataset.sp = s[4];
      fx.appendChild(im);
    });
    const inn = el('div', 'in');
    inn.innerHTML = '<p class="kick">November 2026</p><h2><span class="glt" data-text="The">The</span><span class="glt rd" data-text="upgrade.">upgrade.</span></h2><p class="sub">The old site was a catalog with a lounge. The new one is a loud, character-driven, high-tech glass house: twenty crew members, a travel guide that gets stranger the longer you stay, one-of-one glass fed straight from the studio, and a phone menu shaped like a tube.</p>';
    stage.append(fx, inn);
    hero.appendChild(stage);
    main.appendChild(hero);
    inters.push({ type: 'fin', sec: hero, fx, inn, h: 2.2 });

    const mk = (id, name, title, cap, path) => ({
      img: 'now/' + id, ts: '202611', date: title, cap, url: 'jeromebaker.com' + path.replace('../..', ''), live: path, src: 'now/' + id + '-d.webp', srcM: 'now/' + id + '-m.webp',
      w: 1600, h: 1000, arM: 1688 / 780, fi: { src: 'now/' + id + '-d.webp', ar: 1000 / 1600, regions: [], links: [], pins: [], ts: '202611', page: path }
    });
    const beats = [
      mk('home', 'Home', 'Nov 2026', 'The new home page. Glass, ritual merch, the JB Crew, a Travel Guide and the story, all in one loud place.', '../../'),
      mk('glass', 'Glass', 'Glass', 'Every piece is one of one with its provenance on file. The page reads straight from the studio app, so new work shows up as soon as it is photographed.', '../../glass/'),
      mk('crew', 'Crew', 'The JB Crew', 'Twenty characters off the box art and posters. Each has a page and a weird habit, and they float around the whole site, bump into each other and talk.', '../../crew/'),
      mk('match', 'Match', 'Find your crew', 'Four questions, adults only, and it matches you to the crew member who fits.', '../../crew/match/'),
      mk('hotshop', 'Hot Shop', 'The Hot Shop', 'A 21+ comic set in a glass studio in a drying barn: one centerpiece, seven days, the worst crew alive.', '../../comics/'),
      mk('shop', 'Merch', 'Ritual Merch', 'Streetwear that drops the exact size and colour into the cart, with a crew member wearing every piece.', '../../shop/'),
      mk('travel', 'Travel', 'Travel Guide', 'A trip companion for the big screen. It explains itself, the words dissolve, then it keeps getting stranger the longer it runs.', '../../travel/')
    ];
    beats.forEach((b) => { b.fi.pins = []; b.fi.links = []; });
    buildChapter({ id: 'now-site', theme: 'tnow', years: 'November 2026', title: 'The new site', lede: 'Seven rooms. Every screenshot is the live site, and every one opens.', beats }, { live: true, ghost: '2026' });

    const ph = el('section', 'inter fin phones');
    ph.id = 'phones';
    const pst = el('div', 'stage');
    pst.innerHTML = '<h3>In your pocket</h3><div class="row">' +
      ['home', 'crew', 'glass'].map((n) => '<div class="phone"><img src="now/' + n + '-m.webp" alt="The new site on a phone: ' + n + '" loading="lazy" decoding="async"></div>').join('') +
      '</div><div class="lbl">On a phone the menu is a glass tube at the bottom of the screen</div>';
    ph.appendChild(pst);
    main.appendChild(ph);
    inters.push({ type: 'phones', sec: ph, phones: [...pst.querySelectorAll('.phone')], h: 2.2 });

    const wp = el('section', 'inter fin wipe');
    wp.id = 'then-now';
    const wst = el('div', 'stage');
    wst.innerHTML = '<h3>Then and now</h3><div class="cmp" id="cmp"><img src="img2x/01.webp" alt="The 1998 jeromebaker.com home page" loading="lazy"><img class="after" src="now/home-d.webp" alt="The 2026 jeromebaker.com home page" loading="lazy"><span class="tag a">Dec 1998</span><span class="tag b">Nov 2026</span><i class="knob"></i></div>';
    wp.appendChild(wst);
    main.appendChild(wp);
    const cmp = $('#cmp', wst);
    const wi = { type: 'wipe', sec: wp, cmp, h: 2.2, manual: false };
    inters.push(wi);
    const setCut = (pct) => cmp.style.setProperty('--cut', clamp(pct, 2, 98) + '%');
    const drag = (e) => { const r = cmp.getBoundingClientRect(); wi.manual = true; setCut((e.clientX - r.left) / r.width * 100); };
    cmp.addEventListener('pointerdown', (e) => { cmp.setPointerCapture(e.pointerId); drag(e); cmp.onpointermove = drag; });
    cmp.addEventListener('pointerup', () => { cmp.onpointermove = null; });
    wi.setCut = setCut;

    const cta = el('section', 'cta');
    cta.id = 'enter';
    cta.innerHTML = '<h2>Come<br>on in.</h2><p>That is twenty-four years, one domain, and a lot of glass. The new site is live now. The old pages stay in the archive for anyone who wants to look back.</p>' +
      '<ul class="tiles">' + [['glass', 'Glass', 'One of one, with provenance.', '../../glass/'], ['crew', 'The JB Crew', 'Meet all twenty.', '../../crew/'], ['match', 'Find your crew', 'Four questions.', '../../crew/match/'],
        ['shop', 'Ritual Merch', 'Streetwear, worn by the crew.', '../../shop/'], ['hotshop', 'The Hot Shop', 'The comic.', '../../comics/'], ['travel', 'Travel Guide', 'It gets stranger.', '../../travel/']]
        .map((t) => '<li><a href="' + t[3] + '"><img src="now/' + t[0] + '-d.webp" alt="" loading="lazy"><b>' + t[1] + '</b><span>' + t[2] + '</span></a></li>').join('') + '</ul>' +
      '<div class="endbtns"><a class="y" href="../../">Enter the new site</a><a href="../">Read the whole story</a><button type="button" id="share2">Share this tour</button></div>' +
      '<p class="fine">Every old page is a screenshot of a capture the Internet Archive saved of jeromebaker.com, shown in the order it was saved; we looked at 835 and kept the 34 that tell the story. Where the archive never saved a picture, we filled the gap with the closest thing it does hold and marked it with a dashed yellow outline. Nothing marked as a stand-in is the original. The 2013 to 2016 captures show someone else&rsquo;s page, so they are left out. The 2019 to 2022 pages came back without their stylesheets, so they look plainer than they were. Founded 1991. <a href="https://web.archive.org/web/*/jeromebaker.com" target="_blank" rel="noopener">Browse the archive itself</a>.</p>';
    main.appendChild(cta);
    inters.push({ type: 'cta', sec: cta });
  }

  // ---------- assemble ----------
  D.chapters.forEach((c) => c.beats.forEach((b) => { b.fi = frame(b); b.mi = nMoment++; }));
  D.chapters.forEach((c) => c.beats.forEach((b) => { const k = norm(b.url); (byPage.get(k) || byPage.set(k, []).get(k)).push(b); }));
  D.chapters.forEach((c) => {
    if (c.dark) { addDark(c); return; }
    buildChapter(c);
    if (c.id === 'peak') addReel(c);
    addPull(c, c.theme);
  });
  // beats now carry .mi/.fi (set in stepsFor); link jumps need them
  addFinale();
  $('#count').textContent = '';

  // ---------- layout ----------
  function layout() {
    VH = innerHeight;
    const m = mob();
    chapters.forEach((ch) => {
      ch.sec.style.height = Math.round(VH + ch.nseg * S * VH) + 'px';
      ch.W = ch.view.clientWidth; ch.H = ch.view.clientHeight;
      if (!ch.W) { ch.W = innerWidth * (m ? 1 : 0.95); ch.H = VH - 160; }
      ch.layers.forEach((l) => {
        const live = ch.live;
        const ar = live && m ? l.arM : l.ar;
        l.cur_ar = ar;
        l.el.style.width = ch.W + 'px';
        if (live) { const src = m ? l.img.dataset.m : l.fi.src; if (src && l.img.getAttribute('src') !== src) l.img.src = src; }
      });
      ch.cams = [null].concat(ch.steps.map((st) => camFor(ch, st)));
      ch.cams[0] = ch.cams[1];
    });
    inters.forEach((it) => { if (it.h) it.sec.style.height = Math.round(VH * (1 + it.h)) + 'px'; });
    heroPad();
  }
  function camFor(ch, st) {
    const l = ch.layers.get(st.key), W = ch.W, H = ch.H, ar = l.cur_ar, Hi = W * ar, m = mob();
    let s = 1, tx = 0, ty = Hi > H ? 0 : (H - Hi) / 2;
    if (!st.region && !ch.live) { s = m ? 2.0 : 1.32; tx = (W - W * s) / 2; ty = Hi * s > H ? 0 : (H - Hi * s) / 2; }
    if (st.region) {
      const r = st.region, rw = r.w / 100, rh = r.h / 100;
      s = clamp((m ? 0.92 : 0.5) / rw, 1, 4.4);
      s = Math.max(1, Math.min(s, (m ? 0.5 : 0.78) * H / (rh * Hi)));
      const cx = (r.x + r.w / 2) / 100, cy = (r.y + r.h / 2) / 100;
      const ax = m ? W / 2 : (st.side === 'r' ? 0.36 : 0.64) * W, ay = m ? 0.3 * H : 0.5 * H;
      tx = ax - cx * W * s; ty = ay - cy * Hi * s;
      tx = clamp(tx, Math.min(0, W - W * s), 0);
      ty = Hi * s > H ? clamp(ty, H - Hi * s, 0) : (H - Hi * s) / 2;
    }
    return { s, tx, ty, key: st.key };
  }
  function heroPad() { /* hero is plain flow */ }

  // ---------- rail ----------
  const rail = $('#rail');
  const xPct = (y) => ((y - Y0) / (Y1 - Y0)) * 100;
  (function buildRail() {
    for (let y = 1998; y <= 2026; y += 4) { const t = el('span', 'tick', String(y)); t.style.left = xPct(y) + '%'; rail.appendChild(t); }
    Object.entries(X.captures).forEach(([k, n]) => {
      const y = +k.slice(0, 4) + (+k.slice(5, 7) - 1) / 12;
      const c = el('i', 'col'); c.style.left = xPct(y) + '%'; c.style.height = Math.min(24, Math.round(Math.sqrt(n) * 2.6)) + 'px'; rail.appendChild(c);
    });
    const ids = [].concat(D.chapters.map((c) => c.id), ['now']);
    ids.forEach((id) => {
      const c = D.chapters.find((x) => x.id === id) || { id: 'now', theme: 'tnow', title: 'The upgrade' };
      const sp = SPAN[id]; if (!sp) return;
      const b = el('button', 'seg' + (c.dark ? ' gap' : '')); b.type = 'button';
      b.style.cssText = 'left:' + xPct(sp[0]) + '%;width:' + (xPct(sp[1]) - xPct(sp[0])) + '%;--c:' + ACC[c.theme];
      b.title = c.title; b.setAttribute('aria-label', c.title + ' (jump)');
      b.dataset.id = id;
      b.addEventListener('click', () => jumpTo(id));
      rail.appendChild(b);
    });
    rail.appendChild(el('i', 'dot'));
  })();
  const dot = $('.dot', rail);
  function jumpTo(id) {
    const s = document.getElementById(id === 'now' ? 'now' : id); if (!s) return;
    scrollTo({ top: s.getBoundingClientRect().top + scrollY, behavior: reduce ? 'auto' : 'smooth' });
  }

  // ---------- stepper ----------
  const stepAbs = (st, ch) => ch.sec.getBoundingClientRect().top + scrollY + (st.j + 0.07) * S * VH;
  function chOf(st) { return chapters.find((c) => c.steps.includes(st)); }
  function goMoment(mi, instant) {
    mi = clamp(mi, 0, moments.length - 1);
    const st = moments[mi], ch = chOf(st);
    scrollTo({ top: stepAbs(st, ch), behavior: instant || reduce ? 'auto' : 'smooth' });
  }
  let curMoment = 0;
  $('#prev').addEventListener('click', () => goMoment(curMoment - 1));
  $('#next').addEventListener('click', () => goMoment(curMoment + 1));
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
    if (e.key === 'j' || e.key === 'ArrowRight') { e.preventDefault(); goMoment(curMoment + 1); }
    else if (e.key === 'k' || e.key === 'ArrowLeft') { e.preventDefault(); goMoment(curMoment - 1); }
    else if (e.key === 'l' || e.key === 'L') { const ch = activeCh; if (ch) toggle($('.tb-links', ch.chrome), 'links-on', ch.screen); }
    else if (e.key === 'm' || e.key === 'M') { const ch = activeCh; if (ch) toggle($('.tb-loupe', ch.chrome)); }
  });
  function toggle(btn, cls, target) {
    if (!btn) return;
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    if (cls) target.classList.toggle(cls, on);
  }

  // ---------- lightbox, share ----------
  const lb = $('#lb');
  function openLb(src, cap) { $('#lbi').src = src; $('#lbc').textContent = cap || ''; $('#lbs').scrollTop = 0; if (lb.showModal) lb.showModal(); else lb.setAttribute('open', ''); }
  $('#lbx').addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  main.addEventListener('click', (e) => {
    const f = e.target.closest('[data-full]');
    if (f) { if (f.dataset.b != null) openBrowse(moments[+f.dataset.b]); else openLb(f.dataset.full, f.dataset.cap); }
  });
  // ---------- browse the old page: full-screen, links live ----------
  const br = el('dialog', 'br');
  br.setAttribute('aria-label', 'Browse the old page');
  br.innerHTML = '<div class="brbar"><button type="button" class="brx" aria-label="Close">&times;</button><span class="bru"></span><a class="brw" target="_blank" rel="noopener">archive.org &#8599;</a></div><div class="brs"><div class="brp"><img alt=""></div></div><p class="brh">Tap a link. Teal ones are live on the new site, yellow ones open the archive copy.</p>';
  document.body.appendChild(br);
  $('.brx', br).addEventListener('click', () => br.close());
  function openBrowse(st) {
    const fi = st.fi, b = st.b, sc = $('.brs', br), pg = $('.brp', br), img = $('img', pg);
    $('.bru', br).textContent = b.url + '  ·  ' + b.date;
    $('.brw', br).href = archiveUrl(b, fi);
    pg.querySelectorAll('.hs,.pin').forEach((n) => n.remove());
    const w = mob() ? Math.round(innerWidth * 1.9) : Math.min(innerWidth - 24, 1500);
    pg.style.width = w + 'px';
    img.src = fi.src;
    fi.links.forEach((l) => {
      const a = el('a', 'hs');
      a.style.cssText = 'left:' + l.x + '%;top:' + l.y + '%;width:' + l.w + '%;height:' + l.h + '%';
      const hit = byPage.get(norm(l.href));
      const lv = liveFor(l);
      let go = null;
      if (lv) { a.href = lv.href; a.target = '_blank'; a.classList.add('nl'); a.dataset.nl = lv.name; a.title = (l.label ? l.label + ': ' : '') + 'live on the new site (' + lv.name + ')'; pg.appendChild(a); return; }
      if (hit) { const best = hit.reduce((p, q) => (Math.abs(+q.ts.slice(0, 8) - +fi.ts.slice(0, 8)) < Math.abs(+p.ts.slice(0, 8) - +fi.ts.slice(0, 8)) ? q : p)); if (best.fi !== fi && best.mi != null) go = best.mi; }
      if (go != null) { a.href = '#m' + go; a.addEventListener('click', (e) => { e.preventDefault(); br.close(); goMoment(go); }); }
      else { a.href = linkUrl(l.href, fi.ts); a.target = '_blank'; a.rel = 'noopener'; }
      a.title = l.label || '';
      pg.appendChild(a);
    });
    br.showModal();
    sc.scrollTop = 0;
    sc.scrollLeft = Math.max(0, (pg.offsetWidth - sc.clientWidth) / 2);
  }

  function share() {
    const url = location.href.split('#')[0];
    if (navigator.share) { navigator.share({ title: 'The way back: 24 years of jeromebaker.com', url }).catch(() => {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => flash('Link copied')).catch(() => flash(url));
  }
  function flash(t) {
    const b = $('#share'); const o = b.textContent; b.textContent = t.length > 22 ? 'Copied' : t; setTimeout(() => { b.textContent = o; }, 1800);
  }
  $('#share').addEventListener('click', share);
  document.addEventListener('click', (e) => { if (e.target.id === 'share2') share(); });

  // ---------- chrome buttons, links, tooltips, loupe ----------
  let activeCh = null;
  const tip = el('div', 'tip'); document.body.appendChild(tip);
  const lens = el('div', 'lens'); document.body.appendChild(lens);
  let tipFor = null;
  function showTip(target, html, act) {
    tip.innerHTML = html; tip.classList.toggle('act', !!act);
    const r = target.getBoundingClientRect();
    tip.classList.add('on');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = clamp(r.left + r.width / 2 - tw / 2, 8, innerWidth - tw - 8) + 'px';
    tip.style.top = (r.top - th - 10 < 8 ? r.bottom + 10 : r.top - th - 10) + 'px';
    tipFor = target;
  }
  function hideTip() { tip.classList.remove('on'); tipFor = null; document.querySelectorAll('.hs.sel').forEach((n) => n.classList.remove('sel')); }
  function hsInfo(a) {
    const label = a.dataset.label ? '<b>' + esc(a.dataset.label) + '</b>' : '';
    if (a.dataset.nl) return label + '<small>Live: opens ' + esc(a.dataset.nl) + ' on the new site</small>';
    if (a.dataset.live) return '<b>Open this page</b><small>The live new site</small>';
    if (a.dataset.go != null) return label + '<small>Jumps to ' + esc(moments[+a.dataset.go].b.date) + ' in this tour</small>';
    return label + '<small>The link still works: opens the archive&rsquo;s copy</small>';
  }
  chapters.forEach((ch) => {
    const b = $('.tb-links', ch.chrome), p = $('.tb-pins', ch.chrome), l = $('.tb-loupe', ch.chrome);
    if (b) b.addEventListener('click', () => toggle(b, 'links-on', ch.screen));
    if (p) p.addEventListener('click', () => { const on = p.getAttribute('aria-pressed') !== 'true'; p.setAttribute('aria-pressed', String(on)); ch.screen.classList.toggle('hide-pins', !on); });
    if (l) l.addEventListener('click', () => toggle(l));
    ch.view.addEventListener('pointerover', (e) => {
      if (coarse) return;
      const a = e.target.closest('.hs'); const pin = e.target.closest('.pin');
      if (a) showTip(a, hsInfo(a));
      else if (pin) showTip(pin, '<b>Stand-in: ' + esc(pin.dataset.chip) + '</b><small>' + esc(pin.dataset.note) + '</small>');
    });
    ch.view.addEventListener('pointerout', (e) => { if (!coarse && (e.target.closest('.hs') || e.target.closest('.pin'))) hideTip(); });
    ch.view.addEventListener('click', (e) => {
      const a = e.target.closest('.hs'); const pin = e.target.closest('.pin');
      if (pin && coarse) { e.preventDefault(); hideTip(); showTip(pin, '<b>Stand-in: ' + esc(pin.dataset.chip) + '</b><small>' + esc(pin.dataset.note) + '</small>'); return; }
      if (!a) return;
      if (a.dataset.go != null) { e.preventDefault(); hideTip(); goMoment(+a.dataset.go); return; }
      if (coarse && !a.classList.contains('sel') && !a.dataset.live && !a.dataset.nl) {
        e.preventDefault(); hideTip(); a.classList.add('sel');
        showTip(a, hsInfo(a) + '<a href="' + esc(a.href) + '" target="_blank" rel="noopener">Open &#8599;</a>', true);
      }
    });
    // loupe
    ch.view.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || mob()) return;
      const lb2 = $('.tb-loupe', ch.chrome);
      if (ch.live || !lb2 || lb2.getAttribute('aria-pressed') !== 'true' || !ch.cur) { lens.classList.remove('on'); return; }
      const img = ch.cur.img, r = img.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { lens.classList.remove('on'); return; }
      const Z = 2.2, fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      lens.style.left = e.clientX + 'px'; lens.style.top = e.clientY + 'px';
      lens.style.backgroundImage = 'url("' + img.currentSrc + '")';
      lens.style.backgroundSize = (r.width * Z) + 'px ' + (r.height * Z) + 'px';
      lens.style.backgroundPosition = (95 - fx * r.width * Z) + 'px ' + (95 - fy * r.height * Z) + 'px';
      lens.classList.add('on');
    });
    ch.view.addEventListener('pointerleave', () => lens.classList.remove('on'));
  });
  document.addEventListener('click', (e) => { if (tipFor && !e.target.closest('.tip') && !e.target.closest('.hs') && !e.target.closest('.pin')) hideTip(); });
  addEventListener('scroll', () => lens.classList.remove('on'), { passive: true });

  // ---------- hero background ----------
  (function heroBg() {
    const bg = $('#heroBg'); const pick = [];
    D.chapters.forEach((c) => c.beats.forEach((b) => pick.push(b.img)));
    const want = [0, 3, 5, 8, 10, 12, 13, 14, 16, 18, 20, 22].map((i) => pick[i % pick.length]);
    for (let i = 0; i < 6; i++) {
      const col = el('div'); col.dataset.sp = i % 2 ? '0.06' : '-0.05';
      [want[i], want[i + 6]].forEach((s) => { const im = new Image(); im.src = s; im.alt = ''; im.loading = 'lazy'; col.appendChild(im); });
      bg.appendChild(col);
    }
  })();

  // ---------- the loop ----------
  const progI = $('#prog i'), nowYear = $('#nowYear'), nowTitle = $('#nowTitle'), pill = $('#pill'), count = $('#count');
  let ticking = false;
  function tick() {
    ticking = false;
    const y = scrollY, vh = VH;
    progI.style.width = (y / Math.max(1, document.documentElement.scrollHeight - vh) * 100) + '%';
    document.querySelectorAll('#heroBg > div').forEach((c) => { c.style.transform = 'translateY(' + (y * parseFloat(c.dataset.sp)) + 'px)'; });
    let yearF = null, title = '', act = null;
    chapters.forEach((ch) => {
      const r = ch.sec.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const f = clamp(-r.top / (S * vh), 0, ch.nseg - 0.0001);
      const i = Math.floor(f), t = f - i;
      const A = ch.cams[i], B = ch.cams[Math.min(i + 1, ch.nseg - 1)];
      const stA = i === 0 ? ch.steps[0] : ch.steps[i - 1], stB = ch.steps[Math.min(i, ch.steps.length - 1)];
      const u = i === 0 || i >= ch.nseg - 1 ? 0 : ease(clamp((t - HOLD) / (1 - HOLD), 0, 1));
      const same = A.key === B.key;
      const fa = ch.layers.get(A.key), fb = ch.layers.get(B.key);
      const introMul = i === 0 ? 0.45 + 0.55 * sm(0.2, 0.9, f) : 1;
      ch.layers.forEach((l) => { l.el.style.opacity = 0; l.el.style.pointerEvents = 'none'; });
      const put = (l, c, o, dy) => {
        l.el.style.opacity = o; l.el.style.transform = 'translate3d(' + c.tx.toFixed(1) + 'px,' + (c.ty + (dy || 0)).toFixed(1) + 'px,0) scale(' + c.s.toFixed(4) + ')';
        l.el.style.setProperty('--is', (1 / c.s).toFixed(4));
      };
      if (same) {
        const c = { s: lerp(A.s, B.s, u), tx: lerp(A.tx, B.tx, u), ty: lerp(A.ty, B.ty, u) };
        put(fa, c, introMul);
        ch.cur = fa;
        if (u < 0.5 && introMul > 0.9) fa.el.style.pointerEvents = 'auto';
      } else {
        put(fa, A, (1 - u) * introMul, 0);
        put(fb, B, u, (1 - u) * 24);
        fa.el.style.zIndex = 1; fb.el.style.zIndex = 2;
        ch.cur = u < 0.5 ? fa : fb;
        ch.cur.el.style.pointerEvents = 'auto';
      }
      // intro title, screen entrance
      ch.intro.style.opacity = 1 - sm(0.12, 0.6, f);
      ch.intro.style.transform = 'translateY(' + (-f * 90) + 'px)';
      ch.intro.style.visibility = f > 1 ? 'hidden' : 'visible';
      const se = i === 0 ? sm(0.2, 1, f) : 1;
      ch.screen.style.opacity = 1;
      ch.screen.style.transform = 'translateY(' + ((1 - se) * 40).toFixed(1) + 'px) scale(' + (0.97 + 0.03 * se) + ')';
      ch.ghost.style.transform = 'translate(-50%,-50%) translateX(' + ((0.5 - clamp(f / ch.nseg, 0, 1)) * 160) + 'px)';
      // cards
      ch.steps.forEach((st) => {
        const local = f - st.j;
        const c = st.card;
        if (local < -0.1 || local > 1.05) { if (c.style.opacity !== '0') { c.style.opacity = 0; c.classList.remove('on'); } return; }
        const o = sm(-0.05, 0.14, local) * (1 - sm(0.82, 1.0, local));
        c.style.opacity = o.toFixed(3);
        c.style.transform = 'translateY(' + lerp(80, -70, clamp((local + 0.05) / 1.05, 0, 1)).toFixed(1) + 'px) rotate(' + ((st.side === 'r' ? 1 : -1) * (1 - clamp(local * 2, 0, 1)) * 1.2).toFixed(2) + 'deg)';
        c.classList.toggle('on', o > 0.6);
      });
      // chrome text for the step in view
      const cs = i === 0 ? ch.steps[0] : (t < 0.8 ? ch.steps[i - 1] : stB);
      if (cs && ch.chrome._st !== cs) {
        ch.chrome._st = cs;
        $('.url', ch.chrome).textContent = cs.b.url;
        const sp = $('.srcpill', ch.view); sp.textContent = (ch.live ? '' : 'Archived: ') + cs.b.url + ' ↗'; sp.href = ch.live ? cs.b.live : archiveUrl(cs.b, cs.fi);
        $('.when', ch.chrome).textContent = cs.b.date;
        const w = $('.wb', ch.chrome); if (w) w.href = archiveUrl(cs.b, cs.fi);
        const o = $('.open', ch.chrome); if (o) o.href = cs.b.live;
      }
      if (r.top < vh * 0.5 && r.bottom > vh * 0.5) {
        act = ch;
        const st = cs || ch.steps[0];
        curMoment = st.mi;
        yearF = ch.live ? 2026.9 : yearOf(st.b.ts);
        title = ch.c.title;
      }
    });
    activeCh = act;
    inters.forEach((it) => {
      const r = it.sec.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 1.5) return;
      const total = Math.max(1, it.sec.offsetHeight - vh);
      const p = clamp(-r.top / total, 0, 1);
      if (it.type === 'pull') {
        const q = clamp((vh * 0.88 - r.top) / (vh * 0.7), 0, 1);
        it.words.forEach((w, n) => w.classList.toggle('lit', q * (it.words.length + 2) > n + 1));
      } else if (it.type === 'reel') {
        const track = it.track, max = Math.max(0, track.scrollWidth - innerWidth + 40);
        track.style.transform = 'translateX(' + (-p * max).toFixed(1) + 'px)';
      } else if (it.type === 'dark') {
        it.big.textContent = String(Math.round(lerp(2013, 2016, clamp(p * 1.15, 0, 1))));
      } else if (it.type === 'fin') {
        const mx = clamp(p, 0, 1);
        [...it.fx.children].forEach((im, n) => { const sp = parseFloat(im.dataset.sp); im.style.transform = 'translate3d(' + (Math.sin(mx * 6 + n) * 40 * sp).toFixed(1) + 'px,' + ((0.5 - mx) * 420 * sp).toFixed(1) + 'px,0) rotate(' + (mx * 40 * sp * (n % 2 ? 1 : -1)).toFixed(1) + 'deg)'; });
        it.inn.style.transform = 'scale(' + (0.9 + 0.12 * sm(0, 0.5, p)) + ')';
      } else if (it.type === 'phones') {
        it.phones.forEach((ph, n) => { const q = sm(0.0, 0.7, p); ph.style.transform = 'translateY(' + ((1 - q) * (260 + n * 110) + Math.sin(p * 5 + n) * 12).toFixed(1) + 'px) rotate(' + ((n - 1) * (1 - q) * 14 + (n - 1) * 3).toFixed(1) + 'deg)'; });
      } else if (it.type === 'wipe') {
        if (!it.manual) it.setCut(100 - sm(0.12, 0.88, p) * 96);
      }
      if (r.top < vh * 0.5 && r.bottom > vh * 0.5) {
        if (it.type === 'dark') { yearF = lerp(2013, 2016, p); title = 'The dark years'; }
        if (it.type === 'fin' || it.type === 'phones' || it.type === 'wipe') { yearF = 2026.9; title = 'The upgrade'; }
        if (it.type === 'reel') { yearF = 2001.8; title = 'Piece of the Week'; }
      }
    });
    if (yearF != null) {
      nowYear.textContent = String(Math.floor(yearF + 0.001));
      nowTitle.textContent = title;
      dot.style.left = xPct(yearF) + '%';
    }
    if (activeCh) {
      const id = activeCh.c.id === 'now-site' ? 'now' : activeCh.c.id;
      document.querySelectorAll('.rail .seg').forEach((s) => s.classList.toggle('on', s.dataset.id === id));
      count.innerHTML = 'Moment <b>' + (curMoment + 1) + '</b> of ' + moments.length;
    }
    const inTour = activeCh != null;
    pill.classList.toggle('off', !inTour);
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', () => { if (Math.abs(innerHeight - VH) > 120 || true) { layout(); req(); } });
  addEventListener('load', () => { layout(); req(); });
  document.fonts && document.fonts.ready.then(() => { layout(); req(); });
  layout(); tick();
  if (location.hash && /^#m\d+$/.test(location.hash)) setTimeout(() => goMoment(+location.hash.slice(2), true), 200);
})();
