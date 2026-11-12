/* The Maui sign: on the home page, a crew member jogs across the bottom of the screen holding a sign over their
   head for the new Jason Harris Maui Originals (the 'maui' shelf in js/glass-data.js). The sign links to that shelf
   on the glass page. Starts on the first scroll (or after a few seconds), crosses once, comes back once later.
   Hover or focus holds them still so the sign can be clicked. Skips Lite mode and "Hide the crew"; with reduced
   motion the sign just parks in the corner. Uses the carry pose from assets/anim (arms overhead). */
(() => {
  const base = document.documentElement.dataset.base || '';
  const lite = (() => { try { return localStorage.getItem('jb-lite') === '1'; } catch (e) { return false; } })();
  if (lite) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // [anim folder, frame width at 520 tall, sign center as a fraction of the frame width (over the hands)]
  const WHO = [['alien', 318, .55], ['gorilla', 378, .5], ['bot', 335, .62], ['devil', 410, .55]];
  const who = WHO[Math.floor(Math.random() * WHO.length)];
  const href = `${base}glass/#s-maui`;

  const css = document.createElement('style');
  css.textContent = `
.msign{position:fixed;left:0;bottom:max(8px,env(safe-area-inset-bottom));z-index:76;width:var(--w);pointer-events:none;will-change:transform}
.msign .mw{position:relative;z-index:2;display:block;width:100%;height:auto;filter:drop-shadow(5px 6px 0 rgba(10,10,10,.5));pointer-events:none}
.msign .board{position:absolute;z-index:1;left:calc(var(--cx) * 100%);bottom:calc(100% - var(--hands));translate:-50% 0;rotate:-3deg;display:flex;align-items:center;gap:10px;width:max-content;max-width:min(330px,80vw);padding:8px 14px 8px 8px;background:#FFF100;color:#0A0A0A;border:4px solid #0A0A0A;box-shadow:6px 6px 0 #0A0A0A;text-decoration:none;pointer-events:auto;font:900 15px/1.05 Montserrat,Helvetica,Arial,sans-serif;text-transform:uppercase}
.msign .board img{width:84px;height:56px;object-fit:contain;background:radial-gradient(closest-side,#F0592B,#DA2342 70%,transparent 72%);border-radius:6px;flex:none}
.msign .board b{display:block;font-size:12px;letter-spacing:.06em;color:#DA2342}
.msign .board small{display:block;margin-top:4px;font:800 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.04em;text-transform:none}
.msign .board:hover,.msign .board:focus-visible{background:#fff;outline:none}
.msign .board::after{content:"";position:absolute;left:50%;top:100%;width:6px;height:calc(var(--hands) * .9);translate:-50% 0;background:#7a4a1c;border:2px solid #0A0A0A;z-index:-1}
body.no-crew .msign{display:none}
@media (max-width:860px){.msign{bottom:calc(128px + env(safe-area-inset-bottom))}}
@media (max-width:600px){.msign .board{font-size:13px}.msign .board img{width:64px;height:44px}}`;
  document.head.append(css);

  const small = innerWidth < 600;
  const H = small ? 130 : 180;
  const W = Math.round(who[1] * H / 520);
  const el = document.createElement('div');
  el.className = 'msign';
  el.style.setProperty('--w', `${W}px`);
  el.style.setProperty('--cx', who[2]);
  el.style.setProperty('--hands', `${Math.round(H * .1)}px`);
  el.innerHTML = `<a class="board" href="${href}"><img src="${base}assets/glass/JBD-C4A961A67688_t.webp" alt="" decoding="async"><span><b>New · only 2</b>Jason Harris<br>Maui Originals<small>see them →</small></span></a>
<img class="mw" src="${base}assets/anim/${who[0]}/carry.webp" alt="" width="${W}" height="${H}" decoding="async">`;
  el.querySelector('.board').setAttribute('aria-label', 'New: Jason Harris Maui Originals. See them on the glass page');

  const stage = () => window.JBStage;
  let runs = 0, anim = null, bob = null;
  const cross = () => {
    if (document.body.classList.contains('no-crew')) return;
    const S = stage();
    if (S && !S.claim('maui-sign')) { setTimeout(cross, 2500); return; }
    runs++;
    if (!el.isConnected) document.body.append(el);
    if (reduce) {   // no jogging: park bottom right
      el.style.transform = `translateX(${innerWidth - W - 24}px)`;
      setTimeout(() => { el.remove(); if (S) S.release('maui-sign', 1000); }, 14000);
      return;
    }
    const sign = el.querySelector('.board').offsetWidth;
    const from = -W - sign / 2, to = innerWidth + sign / 2;
    const ms = Math.max(9000, (to - from) / (small ? 70 : 120) * 1000);   // px per second
    anim = el.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration: ms, easing: 'linear' });
    bob = el.querySelector('.mw').animate([{ transform: 'translateY(0) rotate(-3deg)' }, { transform: 'translateY(-10px) rotate(3deg)' }],
      { duration: 340, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    const board = el.querySelector('.board');
    board.animate([{ rotate: '-4deg' }, { rotate: '2deg' }], { duration: 680, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    anim.finished.then(() => {
      el.remove(); bob && bob.cancel();
      if (S) S.release('maui-sign', 3000);
      if (runs < 2) setTimeout(cross, 45000);   // one more pass later in the visit
    }).catch(() => {});
  };
  // hold still while someone is reaching for the sign
  const hold = (on) => { if (anim) on ? anim.pause() : anim.play(); if (bob) on ? bob.pause() : bob.play(); };
  el.addEventListener('pointerenter', () => hold(true), true);
  el.addEventListener('pointerleave', () => hold(false), true);
  el.addEventListener('focusin', () => hold(true));
  el.addEventListener('focusout', () => hold(false));

  let started = false;
  const go = () => { if (started) return; started = true; removeEventListener('scroll', go); cross(); };
  addEventListener('scroll', go, { passive: true, once: true });
  setTimeout(go, 4000);
})();
