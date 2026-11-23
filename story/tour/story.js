/* Scroll-through history: builds chapters from data.js, swaps the browser-window frame as each step passes the
   middle of the screen, pans tall pages as you scroll, and moves a marker along the 1998-2022 rail. */
(function () {
  'use strict';
  const D = window.JB_HISTORY;
  const main = document.getElementById('story');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // a chapter's span on the rail, as fractional years
  const SPAN = {
    'order-line': [1998.9, 2000.0], graffiti: [2000.0, 2001.0], peak: [2001.0, 2002.0], landing: [2002.0, 2003.6],
    restrained: [2003.6, 2006.0], decks: [2006.6, 2008.0], dark: [2013.0, 2016.4], lion: [2016.4, 2019.0],
    history: [2019.0, 2021.0], nft: [2022.0, 2022.8],
  };
  const Y0 = 1998, Y1 = 2023;
  const pos = (y) => ((y - Y0) / (Y1 - Y0)) * 100;
  const yearOf = (ts) => +ts.slice(0, 4) + (+ts.slice(4, 6) - 1) / 12;

  // ---- rail
  const rail = document.getElementById('rail');
  [1998, 2000, 2003, 2006, 2010, 2013, 2016, 2019, 2022].forEach((y) => {
    const t = el('span', 'rail-tick', y); t.style.left = pos(y) + '%'; rail.appendChild(t);
  });
  // how many pages the archive holds for each quarter: the same picture the Wayback calendar draws (square-rooted so 2001 and 2017 both read)
  const X = window.JB_EXTRAS || { captures: {}, wb: {} };
  const SD = window.JB_STANDINS || {};
  (function bars() {
    const q = {};
    Object.keys(X.captures).forEach((k) => { const [y, m] = k.split('-'); const key = y + '.' + Math.floor((+m - 1) / 3); q[key] = (q[key] || 0) + X.captures[k]; });
    const max = Math.max(1, ...Object.values(q).map(Math.sqrt));
    Object.keys(q).forEach((k) => {
      const [y, i] = k.split('.'); const a = +y + i * 0.25;
      const b = el('i', 'rail-bar'); b.style.left = pos(a) + '%'; b.style.width = (pos(Y0 + 0.25) * 0.82) + '%';
      b.style.height = Math.max(2, Math.sqrt(q[k]) / max * 22).toFixed(1) + 'px';
      b.title = ['Jan to Mar', 'Apr to Jun', 'Jul to Sep', 'Oct to Dec'][i] + ' ' + y + ': ' + q[k] + ' pages saved';
      rail.appendChild(b);
    });
  })();
  const dot = el('div', 'rail-dot'); rail.appendChild(dot);
  const segs = {};
  const ACC = { t98: '#ff2a2a', t00: '#4fb0ff', t01: '#FDB514', t02: '#05B48F', t03: '#DA2342', t06: '#FFF100', tdark: '#444', t16: '#FFF100', t19: '#2A3B8E', t22: '#DA2342' };
  D.chapters.forEach((c) => {
    const [a, b] = SPAN[c.id];
    const s = el('button', 'rail-seg' + (c.dark ? ' gap' : '')); s.type = 'button';
    s.style.left = pos(a) + '%'; s.style.width = Math.max(pos(b) - pos(a), 1.2) + '%'; s.style.setProperty('--c', ACC[c.theme] || '#888');
    s.setAttribute('aria-label', c.title + ', ' + c.years);
    s.title = c.title + ' (' + c.years + ')';
    s.onclick = () => document.getElementById(c.id).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    rail.appendChild(s); segs[c.id] = s;
  });
  const railYear = document.getElementById('railYear'), railSub = document.getElementById('railSub');

  // ---- chapters
  const live = []; // {stage parts, steps, beats}
  D.chapters.forEach((c) => {
    const sec = el('section', 'chap ' + c.theme + (c.dark ? ' dark' : '')); sec.id = c.id;
    const head = el('div', 'chap-head');
    head.innerHTML = '<p class="chap-years">' + esc(c.years) + '</p><h2 class="chap-title">' + esc(c.title) + '</h2><p class="chap-lede">' + esc(c.lede) + '</p>';
    sec.appendChild(head);
    if (c.beats.length) {
      const body = el('div', 'chap-body');
      const stage = el('div', 'stage');
      const win = el('div', 'win');
      const hasSD = c.beats.some((b) => SD[b.img]);
      win.innerHTML = '<div class="bar"><i></i><i></i><i></i><span class="url"></span>' +
        '<a class="wb" target="_blank" rel="noopener" title="Open this exact capture on archive.org"><span class="t">archive.org </span>&#8599;</a>' +
        (hasSD ? '<span class="seg" role="group" aria-label="Pictures the archive never saved"><button type="button" data-m="saved">As saved</button><button type="button" data-m="stand">With stand-ins</button></span>' : '') +
        '<span class="cap-date"></span></div>';
      const view = el('div', 'view');
      const imgs = c.beats.map((b, i) => {
        const sh = el('div', 'shot');
        const im = new Image(); im.src = b.img; im.width = b.w; im.height = b.h; im.alt = 'jeromebaker.com as captured in ' + b.date;
        im.decoding = 'async'; if (i > 0) im.loading = 'lazy';
        sh.appendChild(im);
        const sd = SD[b.img];
        if (sd) {
          const pins = el('div', 'pins');
          sd.items.forEach((it) => {
            const p = el('button', 'pin' + (it.x > 45 ? ' r' : '') + (it.y > 60 ? ' u' : '')); p.type = 'button';
            p.style.cssText = 'left:' + it.x + '%;top:' + it.y + '%;width:' + it.w + '%;height:' + it.h + '%';
            p.setAttribute('aria-label', 'Stand-in: ' + it.note);
            p.innerHTML = '<span class="tip"><b>' + esc(it.chip) + '</b>' + esc(it.note) + '</span>';
            pins.appendChild(p);
          });
          sh.appendChild(pins);
        }
        sh._b = b; sh._im = im; sh._sd = sd;
        view.appendChild(sh); return sh;
      });
      win.appendChild(view); stage.appendChild(win); body.appendChild(stage);
      const steps = el('div', 'steps');
      const stepEls = c.beats.map((b) => {
        const s = el('div', 'step' + (b.pan && !reduce ? ' pan' : ''));
        const sd = SD[b.img], n = sd ? sd.items.length : 0;
        const sn = sd ? '<p class="sn"><span class="when-stand">' + (n === 1 ? 'One picture was' : n + ' pictures were') +
          ' never saved by the archive. Each dashed yellow box is a stand-in, the closest match we could find. Hover one for what it is. ' +
          '<button class="lnk" type="button" data-m="saved">See it as saved</button></span>' +
          '<span class="when-saved">This is how the archive saved it, with ' + n + (n === 1 ? ' picture' : ' pictures') + ' missing. ' +
          '<button class="lnk" type="button" data-m="stand">Show the stand-ins</button></span></p>' : '';
        s.innerHTML = '<div class="card"><p class="d">' + esc(b.date) + '</p><p>' + esc(b.cap) + '</p>' + sn + '</div>';
        steps.appendChild(s); return s;
      });
      if (c.beats.some((b) => b.cap && /^Draft note/.test(c.note || ''))) { /* no-op */ }
      if (c.note) { const n = el('div', 'note', esc(c.note)); steps.lastChild.querySelector('.card').appendChild(n); }
      body.appendChild(steps); sec.appendChild(body);
      live.push({ c, sec, win, view, imgs, stepEls, url: win.querySelector('.url'), date: win.querySelector('.cap-date'),
        wb: win.querySelector('.wb'), seg: win.querySelector('.seg'), cur: -1 });
    }
    if (c.quote) {
      const q = el('blockquote', 'pull'); q.innerHTML = '<p>' + esc(c.quote[0]) + '</p><footer>' + esc(c.quote[1]) + '</footer>'; sec.appendChild(q);
    }
    if (c.id === 'peak' && D.reel.length) {
      const r = el('div', 'reel'); r.appendChild(el('h3', null, 'Piece of the Week, autumn 2001'));
      const row = el('div', 'reel-row');
      D.reel.forEach((p) => { const im = new Image(); im.src = p.img; im.width = p.w; im.height = p.h; im.loading = 'lazy'; im.alt = 'A glass piece from the 2001 Piece of the Week archive'; row.appendChild(im); });
      r.appendChild(row); sec.appendChild(r);
    }
    main.appendChild(sec);
  });

  // ---- scroll
  // the pictures the archive never saved: show stand-ins (default) or the page exactly as saved. The choice is remembered.
  let mode = 'stand';
  try { mode = localStorage.getItem('jbh-mode') === 'saved' ? 'saved' : 'stand'; } catch (e) { /* private mode */ }
  const dimsOf = (sh) => (sh._sd && mode === 'stand' ? sh._sd : sh._b);
  function applyMode() {
    document.body.dataset.mode = mode;
    live.forEach((L) => {
      L.imgs.forEach((sh) => {
        if (!sh._sd) return;
        const d = dimsOf(sh);
        sh._im.src = mode === 'stand' ? sh._sd.img : sh._b.img; sh._im.width = d.w; sh._im.height = d.h;
      });
      L.cur = -1;
    });
    document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x.dataset.m === mode));
    req();
  }
  main.addEventListener('click', (e) => {
    const t = e.target.closest('[data-m]');
    if (!t) return;
    mode = t.dataset.m === 'saved' ? 'saved' : 'stand';
    try { localStorage.setItem('jbh-mode', mode); } catch (er) { /* ignore */ }
    applyMode();
  });

  function show(L, i) {
    if (L.cur === i) return;
    L.cur = i;
    L.imgs.forEach((im, k) => im.classList.toggle('on', k === i));
    L.stepEls.forEach((s, k) => s.classList.toggle('on', k === i));
    const b = L.c.beats[i];
    L.url.textContent = b.url; L.date.textContent = b.date;
    L.wb.hidden = !X.wb[b.img]; L.wb.href = X.wb[b.img] || '#';
    const sh = L.imgs[i], d = dimsOf(sh);
    if (L.seg) L.seg.hidden = !sh._sd;
    const vh = L.view.clientHeight, vw = L.view.clientWidth;
    const dh = vw * d.h / d.w;
    const fit = !b.pan && dh > vh * 1.02;
    sh.classList.toggle('fit', fit);
    sh.style.width = fit ? (vh * d.w / d.h).toFixed(1) + 'px' : '';
    sh.style.left = fit ? ((vw - vh * d.w / d.h) / 2).toFixed(1) + 'px' : '';
  }

  let ticking = false;
  function update() {
    ticking = false;
    const vh = innerHeight;
    let active = null;
    live.forEach((L) => {
      const r = L.sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      // which step is across the middle line
      let idx = 0;
      L.stepEls.forEach((s, k) => { if (s.getBoundingClientRect().top <= vh * 0.55) idx = k; });
      show(L, idx);
      const b = L.c.beats[idx], im = L.imgs[idx];
      if (b.pan && !reduce) {
        const s = L.stepEls[idx].getBoundingClientRect();
        const p = clamp((vh * 0.6 - s.top) / Math.max(s.height - vh * 0.2, 1), 0, 1);
        const dd = dimsOf(im), dh = L.view.clientWidth * dd.h / dd.w, over = Math.max(dh - L.view.clientHeight, 0);
        im.style.transform = 'translate3d(0,' + (-over * p).toFixed(1) + 'px,0)';
      }
      if (r.top < vh * 0.6 && r.bottom > vh * 0.4) active = { L, idx };
    });
    if (active) { const k = frames.findIndex((f) => f.L === active.L && f.i === active.idx); if (k >= 0) { cur = k; fno.textContent = k + 1; } }
    // rail marker: follow the active chapter's beat date, else the chapter under the middle line
    let chap = null;
    D.chapters.forEach((c) => { const s = document.getElementById(c.id).getBoundingClientRect(); if (s.top <= vh * 0.5 && s.bottom > vh * 0.5) chap = c; });
    Object.keys(segs).forEach((k) => segs[k].classList.toggle('on', !!chap && chap.id === k));
    if (chap) {
      const L = live.find((x) => x.c === chap);
      let y, label;
      if (L && L.cur >= 0) { const b = chap.beats[L.cur]; y = yearOf(b.ts); label = b.date.slice(0, 3); railYear.textContent = b.ts.slice(0, 4); }
      else { const [a, bb] = SPAN[chap.id]; y = (a + bb) / 2; label = ''; railYear.textContent = chap.dark ? '2013 to 16' : String(Math.floor(a + 0.05)); }
      railSub.textContent = (label ? label + ' · ' : '') + chap.title;
      dot.style.left = pos(y) + '%';
    } else if (scrollY < vh * 0.5) { railYear.textContent = '1998'; railSub.textContent = 'start'; dot.style.left = pos(1998.9) + '%'; }
    else { railYear.textContent = '2022'; railSub.textContent = 'last capture'; dot.style.left = pos(2022.7) + '%'; }
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', () => { live.forEach((L) => { L.cur = -1; }); req(); });

  // ---- frame stepper: every frame in order, with arrow keys (left/right, or k/j)
  const frames = [];
  live.forEach((L) => L.stepEls.forEach((s, i) => frames.push({ L, i, s })));
  let cur = 0;
  const nav = el('div', 'nav');
  nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', 'Step through the frames');
  nav.innerHTML = '<button type="button" class="pv" aria-label="Previous frame">&#8592;</button><span class="count">frame <b id="fno">1</b> of ' + frames.length + '</span><button type="button" class="nx" aria-label="Next frame">&#8594;</button>';
  document.body.appendChild(nav);
  const fno = nav.querySelector('#fno');
  const go = (k) => {
    k = clamp(k, 0, frames.length - 1);
    const r = frames[k].s.getBoundingClientRect();
    scrollTo({ top: scrollY + r.top - innerHeight * 0.5, behavior: reduce ? 'auto' : 'smooth' });
  };
  nav.querySelector('.pv').onclick = () => go(cur - 1);
  nav.querySelector('.nx').onclick = () => go(cur + 1);
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
    if (e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); go(cur + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); go(cur - 1); }
  });

  // ---- every stand-in, listed at the bottom for anyone checking the page
  const list = document.getElementById('standins');
  if (list) {
    const rows = [];
    D.chapters.forEach((c) => c.beats.forEach((b) => { const sd = SD[b.img]; if (sd) sd.items.forEach((it) => rows.push([b, it])); }));
    const t = el('details', 'swap');
    t.innerHTML = '<summary>All ' + rows.length + ' stand-ins on this page</summary><table><thead><tr><th>Frame</th><th>Marked</th><th>What it is</th></tr></thead><tbody>' +
      rows.map(([b, it]) => '<tr><td>' + esc(b.date) + '<br><code>' + esc(b.url) + '</code></td><td>' + esc(it.chip) + '</td><td>' + esc(it.note) + '</td></tr>').join('') + '</tbody></table>';
    list.appendChild(t);
  }

  applyMode();
  update();
})();
