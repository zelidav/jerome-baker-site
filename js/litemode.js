/* Lite mode: one switch that turns off everything heavy and keeps the site looking like itself.
   Off in Lite: the holo cloth (WebGL, the original art stays), the crew drop-ins and their antics, the Baker dance,
   the auto-rotating featured strip, live SVG shadow filters (painted dots instead) and the looping CSS animations
   (ticker, bobbing stickers, drifting collage, glitch text). Everything you click still works.
   The switch sits bottom left next to "Hide the crew". If the page runs slow (under 25 frames a second for about
   5 seconds) it offers Lite once per visit. Stored in localStorage 'jb-lite'; the other scripts read that key
   themselves, so it works whatever order they load in. Loaded by js/dock.js. */
(() => {
  if (window.JBLite) return;
  const root = document.documentElement;
  let on = false;
  try { on = localStorage.getItem('jb-lite') === '1'; } catch (e) { /* storage blocked: no Lite, no switch */ return; }
  if (on) root.classList.add('saver');

  const css = document.createElement('style');
  css.textContent = `
html.saver .marq,html.saver .bob,html.saver .bob2,html.saver .spin,html.saver .spinr,html.saver .jig,html.saver .hero-piece,html.saver .hero-tag,html.saver .zg,
html.saver .boxbg::before,html.saver .glt,html.saver .glt::before,html.saver .glt::after,html.saver .hdr-logo,html.saver .hdr-logo *{animation:none!important}
.lite-btn{min-height:44px;padding:0 12px;border:3px solid var(--ink,#0A0A0A);background:var(--white,#fff);color:var(--ink,#0A0A0A);font:800 13px Montserrat,Helvetica,Arial,sans-serif;box-shadow:4px 4px 0 var(--ink,#0A0A0A);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.lite-btn i{display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid var(--ink,#0A0A0A);background:transparent}
.lite-btn[aria-pressed="true"]{background:var(--yellow,#FFF100)}
.lite-btn[aria-pressed="true"] i{background:var(--ink,#0A0A0A)}
.lite-btn:focus-visible{outline:3px solid var(--red,#DA2342);outline-offset:2px}
.lite-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));translate:-50% 0;z-index:80;display:flex;align-items:center;gap:10px;max-width:calc(100% - 32px);padding:10px 12px 10px 16px;background:var(--ink,#0A0A0A);color:#fff;border:3px solid var(--yellow,#FFF100);box-shadow:5px 5px 0 var(--red,#DA2342);font:800 15px/1.25 Montserrat,Helvetica,Arial,sans-serif;rotate:-1deg;animation:lite-in .35s cubic-bezier(.2,1.5,.4,1)}
.lite-toast button{min-height:40px;padding:0 12px;border:3px solid var(--yellow,#FFF100);background:var(--yellow,#FFF100);color:var(--ink,#0A0A0A);font:900 14px Montserrat,Helvetica,Arial,sans-serif;cursor:pointer}
.lite-toast button.x{background:none;color:#fff;border-color:transparent;font-size:20px;padding:0 6px}
@keyframes lite-in{from{opacity:0;translate:-50% 20px}to{opacity:1;translate:-50% 0}}
@media (max-width:760px){.lite-toast{bottom:calc(150px + env(safe-area-inset-bottom))}}
@media (prefers-reduced-motion:reduce){.lite-toast{animation:none}}`;
  document.head.append(css);

  const set = (v) => {
    try { localStorage.setItem('jb-lite', v ? '1' : ''); } catch (e) { /* storage blocked */ }
    // the heavy parts are already running (or already skipped): a reload is the clean switch
    location.reload();
  };
  const corner = () => {
    if (window.JBCrew && window.JBCrew.corner) return window.JBCrew.corner();
    let c = document.querySelector('.jb-corner');
    if (!c) { c = document.createElement('div'); c.className = 'jb-corner'; document.body.appendChild(c); }
    return c;
  };
  const mount = () => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lite-btn';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.title = on ? 'Lite mode is on: the heavy effects are off. Tap to turn them back on.' : 'Lite mode: turn off the heavy effects if the page lags';
    b.innerHTML = '<i aria-hidden="true"></i>';
    b.append(on ? 'Lite on' : 'Lite mode');
    b.addEventListener('click', () => set(!on));
    corner().append(b);
  };

  // running slow? offer Lite once per visit
  const watch = () => {
    if (on) return;
    try { if (sessionStorage.getItem('jb-lite-asked')) return; } catch (e) { return; }
    let frames = 0, slow = 0, secs = 0;
    const tick = () => { frames++; if (secs < 40) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const iv = setInterval(() => {
      secs++;
      const fps = frames; frames = 0;
      if (document.hidden) { slow = 0; return; }
      slow = fps < 25 ? slow + 1 : 0;
      if (slow >= 5) { clearInterval(iv); offer(); }
      if (secs >= 40) clearInterval(iv);
    }, 1000);
  };
  const offer = () => {
    try { sessionStorage.setItem('jb-lite-asked', '1'); } catch (e) { /* storage blocked */ }
    const t = document.createElement('div');
    t.className = 'lite-toast';
    t.setAttribute('role', 'status');
    const msg = document.createElement('span');
    msg.textContent = 'Running slow? Switch to Lite.';
    const go = document.createElement('button');
    go.type = 'button'; go.textContent = 'Switch to Lite';
    go.addEventListener('click', () => set(true));
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'x'; x.setAttribute('aria-label', 'No thanks'); x.textContent = '×';
    x.addEventListener('click', () => t.remove());
    t.append(msg, go, x);
    document.body.append(t);
    setTimeout(() => t.remove(), 14000);
  };

  window.JBLite = { on, set, offer };
  const start = () => { mount(); setTimeout(watch, 3000); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start, { once: true }) : start();
})();
