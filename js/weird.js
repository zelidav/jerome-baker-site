(() => {
  // One weird behaviour per crew page, picked by <body data-weird="...">.
  const kind = document.body.dataset.weird;
  const base = document.documentElement.dataset.base || '';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!kind || reduce) return;
  const fx = document.createElement('div');
  fx.className = 'fx-layer';
  fx.setAttribute('aria-hidden', 'true');
  document.body.appendChild(fx);
  const css = (t) => { const s = document.createElement('style'); s.textContent = t; document.head.appendChild(s); };
  const el = (tag, style, cls) => { const e = document.createElement(tag); if (style) e.style.cssText = style; if (cls) e.className = cls; return e; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const main = document.querySelector('main');
  const hero = document.querySelector('.cp-hero');
  const ptr = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; }, { passive: true });
  const blobs = () => [...document.querySelectorAll('.cp-name span, .cp-bio, .cp-title, .say .line, .mcard, .rap, .before img, h2')];

  const FX = {
    flame() {
      css('.flame{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#FFF100 0 25%,#FDB514 45%,#DA2342 70%,transparent 72%);animation:fl .9s ease-out forwards}@keyframes fl{to{transform:translate(var(--dx),-120px) scale(.1);opacity:0}}');
      let t = 0;
      addEventListener('pointermove', (e) => {
        const now = performance.now(); if (now - t < 24) return; t = now;
        const f = el('span', `left:${e.clientX - 11}px;top:${e.clientY - 11}px;--dx:${rnd(-30, 30)}px`, 'flame');
        fx.appendChild(f); setTimeout(() => f.remove(), 900);
      }, { passive: true });
    },
    zerog() {
      css('.zg{animation:zg var(--d) ease-in-out infinite alternate}@keyframes zg{to{translate:var(--x) var(--y);rotate:var(--r)}}.fallen{translate:0 60vh!important;rotate:var(--r)!important;transition:translate 1s cubic-bezier(.5,0,1,.5),rotate 1s}');
      blobs().forEach((b) => { b.classList.add('zg'); b.style.setProperty('--d', rnd(4, 9) + 's'); b.style.setProperty('--x', rnd(-40, 40) + 'px'); b.style.setProperty('--y', rnd(-50, 30) + 'px'); b.style.setProperty('--r', rnd(-14, 14) + 'deg'); });
      const btn = el('button', 'position:fixed;right:16px;bottom:16px;pointer-events:auto;z-index:80', 'btn btn-yellow');
      btn.textContent = 'Turn gravity on';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => {
        blobs().forEach((b) => b.classList.add('fallen'));
        btn.textContent = 'Ow.';
        setTimeout(() => { blobs().forEach((b) => b.classList.remove('fallen')); btn.textContent = 'Turn gravity on'; }, 1800);
      });
    },
    bite() {
      css('.bite{width:120px;height:120px;border-radius:50%;background:#0A0A0A;box-shadow:0 0 0 6px #fff inset}.fin{bottom:-10px;width:120px;height:90px;background:#2A3B8E;clip-path:polygon(0 100%,62% 0,100% 100%);animation:fin 9s linear infinite}@keyframes fin{from{left:-140px}to{left:105vw}}');
      fx.appendChild(el('span', '', 'fin'));
      let n = 0;
      addEventListener('scroll', () => {
        const want = Math.floor(scrollY / 260);
        while (n < want && n < 40) { n++; const side = n % 2; fx.appendChild(el('span', `${side ? 'right' : 'left'}:-60px;top:${rnd(5, 90)}vh`, 'bite')); }
      }, { passive: true });
    },
    wobble() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
      svg.innerHTML = '<filter id="wob"><feTurbulence id="turb" type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="22"/></filter>';
      document.body.appendChild(svg);
      main.style.filter = 'url(#wob)';
      const turb = svg.querySelector('#turb');
      const tick = (t) => { turb.setAttribute('baseFrequency', `${0.010 + 0.004 * Math.sin(t / 1300)} ${0.018 + 0.006 * Math.cos(t / 1700)}`); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    },
    beat() {
      css('main{animation:beat .5s cubic-bezier(.2,2,.4,1) infinite}@keyframes beat{0%{scale:1}12%{scale:1.012}}.drop main{animation:shake .12s linear 8}@keyframes shake{25%{translate:8px -4px}50%{translate:-8px 4px}75%{translate:4px 8px}}.drop{background:#DA2342!important}.drop .cp-hero{filter:invert(1) hue-rotate(180deg)}');
      const btn = el('button', 'position:fixed;right:16px;bottom:16px;pointer-events:auto;z-index:80', 'btn btn-red');
      btn.textContent = 'Drop the bass';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => { document.body.classList.add('drop'); setTimeout(() => document.body.classList.remove('drop'), 1000); });
    },
    honey() {
      css('.drip{top:0;width:var(--w);background:linear-gradient(90deg,#c97a00,#FDB514 40%,#ffd75e 55%,#c97a00);border-radius:0 0 999px 999px;height:var(--h);transition:height .4s ease;opacity:.92}');
      const drips = Array.from({ length: 14 }, (_, i) => { const d = el('span', `left:${i * 7.4 + rnd(-2, 2)}vw;--w:${rnd(26, 60)}px;--h:${rnd(20, 60)}px`, 'drip'); d.dataset.k = rnd(0.2, 1.1); fx.appendChild(d); return d; });
      addEventListener('scroll', () => drips.forEach((d) => d.style.setProperty('--h', 30 + scrollY * d.dataset.k * 0.35 + 'px')), { passive: true });
    },
    sneakers() {
      const shoes = ['192', '252', '272', '231'];
      let stack = 0;
      addEventListener('click', (e) => {
        if (e.target.closest('a,button,input')) return;
        const s = el('img', `left:${e.clientX - 60}px;top:${e.clientY - 40}px;width:120px;rotate:${rnd(-40, 40)}deg;transition:top 1s cubic-bezier(.5,0,1,1),rotate 1s`);
        s.src = base + 'assets/merch/' + shoes[stack % shoes.length] + '.webp'; s.alt = '';
        fx.appendChild(s);
        requestAnimationFrame(() => requestAnimationFrame(() => { s.style.top = (innerHeight - 70 - (stack % 8) * 22) + 'px'; s.style.rotate = rnd(-12, 12) + 'deg'; }));
        stack++;
      });
    },
    oil() {
      css('.slick{left:0;right:0;bottom:0;height:var(--h,14vh);background:linear-gradient(180deg,rgba(10,10,10,.0),#0A0A0A 18%),linear-gradient(90deg,#4b2a7a,#1d6b6b,#7a6a1d,#4b2a7a);background-blend-mode:normal;animation:tide 7s ease-in-out infinite alternate;mix-blend-mode:multiply}@keyframes tide{to{height:34vh}}.sheen{left:0;right:0;bottom:0;height:30vh;background:conic-gradient(from 0deg at 50% 120%,#ff00c8,#00ffd5,#fff200,#ff00c8);opacity:.18;mix-blend-mode:screen;animation:tide 7s ease-in-out infinite alternate}');
      fx.appendChild(el('span', '', 'slick')); fx.appendChild(el('span', '', 'sheen'));
    },
    beam() {
      css('.beam{width:240px;height:100vh;top:0;background:linear-gradient(180deg,rgba(5,180,143,.0),rgba(170,255,120,.45));clip-path:polygon(44% 0,56% 0,100% 100%,0 100%);mix-blend-mode:screen}.ufo{width:120px;height:40px;border-radius:50%;background:#bbb;box-shadow:0 -14px 0 -4px #6cf inset,0 6px 0 #555}.up{display:inline-block;transition:translate .8s ease,opacity .8s}.up.gone{translate:0 -60vh;opacity:0}');
      const beam = el('span', '', 'beam'), ufo = el('span', '', 'ufo');
      fx.appendChild(beam); fx.appendChild(ufo);
      document.querySelectorAll('.cp-bio, .rap dd').forEach((p) => {
        const parts = p.textContent.split(/(\s+)/);
        p.textContent = '';
        parts.forEach((w) => { if (/\s/.test(w)) p.appendChild(document.createTextNode(w)); else { const s = el('span', '', 'up'); s.textContent = w; p.appendChild(s); } });
      });
      const loop = () => {
        beam.style.left = ptr.x - 120 + 'px'; beam.style.top = '0px'; ufo.style.left = ptr.x - 60 + 'px'; ufo.style.top = '6px';
        requestAnimationFrame(loop);
      };
      loop();
      document.addEventListener('pointerover', (e) => { if (e.target.classList && e.target.classList.contains('up')) { e.target.classList.add('gone'); setTimeout(() => e.target.classList.remove('gone'), 4000); } });
    },
    sway() {
      css('main{transform-origin:50% 0;animation:sway 6s ease-in-out infinite}@keyframes sway{0%,100%{rotate:-1.2deg}50%{rotate:1.2deg}}.cp-name span{animation:ss 2.4s ease-in-out infinite}.cp-name span:nth-child(2){animation-delay:-.8s}.cp-name span:nth-child(3){animation-delay:-1.6s}@keyframes ss{50%{translate:0 -14px}}');
    },
    melt() {
      css('.cp-name span,.cp-title,.rap h2,.wearing h2{animation:melt 5s ease-in infinite;transform-origin:50% 0}@keyframes melt{0%,40%{transform:none;filter:none}80%{transform:scaleY(1.5) skewX(4deg);filter:blur(1.5px)}100%{transform:none}}.scoop{width:46px;height:46px;border-radius:50% 50% 45% 45%;animation:scoop 4s ease-in forwards}@keyframes scoop{to{transform:translateY(110vh)}}body{background:#ff6a3d}');
      const cols = ['#ffd1dc', '#fff3b0', '#c8f7c5', '#8B4513', '#fff'];
      setInterval(() => { if (document.hidden) return; const s = el('span', `left:${rnd(0, 96)}vw;top:-50px;background:${cols[Math.floor(rnd(0, cols.length))]}`, 'scoop'); fx.appendChild(s); setTimeout(() => s.remove(), 4000); }, 700);
    },
    confiscated() {
      css('.stamp{font-family:var(--display);font-weight:900;font-size:clamp(36px,6vw,80px);color:#DA2342;border:8px solid #DA2342;padding:4px 18px;opacity:.82;animation:stamp .25s cubic-bezier(.2,2,.4,1)}@keyframes stamp{from{scale:3;opacity:0}}');
      const words = ['CONFISCATED', 'EVIDENCE', 'SEIZED', 'EXHIBIT A', 'STILL HERE', 'NOT FOR YOU', 'PAPERWORK'];
      let n = 0, lastY = 0;
      addEventListener('scroll', () => {
        if (Math.abs(scrollY - lastY) < 340 || n > 14) return; lastY = scrollY; n++;
        const s = el('span', `left:${rnd(2, 60)}vw;top:${rnd(8, 80)}vh;rotate:${rnd(-24, 24)}deg`, 'stamp');
        s.textContent = words[n % words.length]; fx.appendChild(s);
      }, { passive: true });
    },
    dark() {
      const d = el('span', 'inset:0;background:#000;pointer-events:none');
      fx.style.zIndex = 69; fx.appendChild(d);
      const loop = () => { const m = `radial-gradient(circle 190px at ${ptr.x}px ${ptr.y}px,transparent 0,transparent 60%,#000 100%)`; d.style.webkitMaskImage = m; d.style.maskImage = m; d.style.background = 'rgba(0,0,0,.94)'; requestAnimationFrame(loop); };
      loop();
    },
    roll() {
      css('.rolly{width:150px;animation:roll 6s linear forwards}@keyframes roll{from{left:-180px;rotate:0deg}to{left:110vw;rotate:1080deg}}.knocked{rotate:var(--kr)!important;translate:0 30px!important;transition:rotate .5s cubic-bezier(.2,2,.4,1),translate .5s}');
      const go = () => {
        const r = el('img', `top:${rnd(20, 75)}vh`, 'rolly'); r.src = base + 'assets/crew/dillo.webp'; r.alt = '';
        fx.appendChild(r);
        const t0 = performance.now();
        const hit = () => {
          const rb = r.getBoundingClientRect();
          blobs().forEach((b) => { const bb = b.getBoundingClientRect(); if (bb.left < rb.right && bb.right > rb.left && bb.top < rb.bottom && bb.bottom > rb.top) { b.style.setProperty('--kr', rnd(-30, 30) + 'deg'); b.classList.add('knocked'); setTimeout(() => b.classList.remove('knocked'), 2400); } });
          if (performance.now() - t0 < 6000) requestAnimationFrame(hit); else r.remove();
        };
        hit();
      };
      setTimeout(go, 1200); setInterval(() => { if (!document.hidden) go(); }, 9000);
    },
    speed() {
      css('.line{height:3px;width:30vw;background:#fff;opacity:.7;animation:zoom .5s linear forwards}@keyframes zoom{from{transform:translateX(100vw)}to{transform:translateX(-40vw)}}main{transition:transform .2s ease-out}');
      setInterval(() => { if (document.hidden) return; const l = el('span', `top:${rnd(0, 100)}vh;left:0`, 'line'); fx.appendChild(l); setTimeout(() => l.remove(), 500); }, 60);
      let ly = scrollY, t;
      addEventListener('scroll', () => { const v = scrollY - ly; ly = scrollY; main.style.transform = `skewY(${Math.max(-8, Math.min(8, v * 0.15))}deg)`; clearTimeout(t); t = setTimeout(() => (main.style.transform = ''), 120); }, { passive: true });
    },
    eye() {
      css('.bigeye{width:60vmin;height:60vmin;left:50%;top:50%;margin:-30vmin 0 0 -30vmin;border-radius:50%;background:radial-gradient(circle,#fff 0 60%,#ddd);opacity:.16}.pupil{width:22vmin;height:22vmin;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff 0 8%,#2A3B8E 10% 40%,#000 42%)}.cp-name span{transition:font-size 1s}');
      const eye = el('span', '', 'bigeye'), pupil = el('span', '', 'pupil');
      eye.appendChild(pupil); fx.style.zIndex = 1; fx.appendChild(eye);
      const loop = () => { const r = eye.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, a = Math.atan2(ptr.y - cy, ptr.x - cx), d = Math.min(r.width * 0.25, Math.hypot(ptr.x - cx, ptr.y - cy) / 4); pupil.style.transform = `translate(${r.width / 2 - pupil.offsetWidth / 2 + Math.cos(a) * d}px,${r.height / 2 - pupil.offsetHeight / 2 + Math.sin(a) * d}px)`; requestAnimationFrame(loop); };
      loop();
      [...document.querySelectorAll('.cp-name span')].forEach((s, i) => (s.style.fontSize = 100 - i * 22 + '%'));
    },
    hypno() {
      css('.spiral{left:50%;top:50%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;background:repeating-conic-gradient(#2A3B8E 0 10deg,#FFF100 10deg 20deg);animation:spin 6s linear infinite;opacity:.22;mask:radial-gradient(circle,#000 0 30%,transparent 70%);-webkit-mask:radial-gradient(circle,#000 0 30%,transparent 70%)}.chant{left:0;right:0;top:46vh;text-align:center;font-family:var(--display);font-weight:900;font-size:clamp(28px,5vw,64px);color:#fff;text-shadow:4px 4px 0 #DA2342;animation:pulse 3s ease-in-out infinite}@keyframes pulse{50%{scale:1.15;opacity:.4}}');
      fx.style.zIndex = 1; fx.appendChild(el('span', '', 'spiral'));
      const c = el('span', '', 'chant'); fx.appendChild(c);
      const lines = ['You are getting very stylish.', 'Your hat is now a snapback.', 'Look into the hat.', 'You feel... merch.', 'Wake up. Okay, not yet.'];
      let i = 0; c.textContent = lines[0]; setInterval(() => (c.textContent = lines[++i % lines.length]), 3000);
    },
    eyes() {
      css('.eb{width:var(--s);height:var(--s);border-radius:50%;background:#fff;border:3px solid #0A0A0A;box-shadow:3px 3px 0 #0A0A0A;overflow:hidden}.eb i{position:absolute;left:30%;top:30%;width:40%;height:40%;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff 0 12%,#05B48F 15% 50%,#000 52%)}.eb.blink{scale:1 .08;transition:scale .08s}');
      const eyes = Array.from({ length: innerWidth < 720 ? 14 : 30 }, () => { const s = rnd(28, 70); const e = el('span', `left:${rnd(0, 96)}vw;top:${rnd(0, 94)}vh;--s:${s}px`, 'eb'); e.appendChild(el('i')); fx.appendChild(e); return e; });
      const loop = () => { eyes.forEach((e) => { const r = e.getBoundingClientRect(), a = Math.atan2(ptr.y - r.top - r.height / 2, ptr.x - r.left - r.width / 2); e.firstChild.style.transform = `translate(${Math.cos(a) * r.width * 0.22}px,${Math.sin(a) * r.width * 0.22}px)`; }); requestAnimationFrame(loop); };
      loop();
      setInterval(() => { const e = eyes[Math.floor(rnd(0, eyes.length))]; e.classList.add('blink'); setTimeout(() => e.classList.remove('blink'), 140); }, 300);
    },
    xmarks() {
      addEventListener('click', (e) => {
        if (e.target.closest('a,button,input')) return;
        const x = el('img', `left:${e.clientX - 40}px;top:${e.clientY - 40}px;width:80px;rotate:${rnd(-30, 30)}deg;animation:pop .3s cubic-bezier(.2,2,.4,1)`);
        x.src = base + 'assets/img/jb-mark.webp'; x.alt = ''; fx.appendChild(x);
      });
      css('@keyframes pop{from{scale:0}}main{animation:breathe2 8s ease-in-out infinite}@keyframes breathe2{50%{scale:1.015}}');
    },
    chomp() {
      css('.teeth{left:0;right:0;height:52vh;background:repeating-linear-gradient(90deg,#fff 0 70px,#ddd 70px 74px);transition:transform .25s cubic-bezier(.6,0,.4,1)}.teeth.t{top:0;transform:translateY(-100%);border-bottom:14px solid #DA2342;clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}.teeth.b{bottom:0;transform:translateY(100%);border-top:14px solid #DA2342}.shut .teeth{transform:none}');
      const t = el('span', '', 'teeth t'), b = el('span', '', 'teeth b');
      fx.style.zIndex = 85; fx.appendChild(t); fx.appendChild(b);
      let idle;
      const wake = () => { document.body.classList.remove('shut'); clearTimeout(idle); idle = setTimeout(() => document.body.classList.add('shut'), 4500); };
      ['pointermove', 'scroll', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, wake, { passive: true }));
      wake();
    }
  };
  (FX[kind] || (() => {}))();
})();
