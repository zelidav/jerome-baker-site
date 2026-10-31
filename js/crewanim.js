/* Animated crew members: frame-by-frame poses (js/anim-data.js, tools/build_anim.py) on a positioned layer.
   An Actor stands with its feet at (x, feet), faces right unless flipped, and swaps poses like a flip-book.
   Used by the glass bench (the hit) and js/antics.js. */
(() => {
  const A = window.JB_ANIM;
  if (!A) return;
  const base = document.documentElement.dataset.base || '';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const loaded = new Set();
  const preload = (slug) => {
    if (loaded.has(slug)) return;
    loaded.add(slug);
    const a = A[slug];
    Object.keys(a.frames).forEach((p) => { const i = new Image(); i.decoding = 'async'; i.src = `${base}assets/anim/${a.img}/${p}.webp`; });
  };

  class Actor {
    constructor(layer, slug, height) {
      this.a = A[slug];
      this.slug = slug;
      this.H = height;
      this.x = 0; this.feet = 0; this.flip = false;
      this.el = document.createElement('img');
      this.el.className = 'actor';
      this.el.alt = '';
      this.el.draggable = false;
      layer.appendChild(this.el);
      preload(slug);
      this.pose('stand');
      // double-click (or double-tap) a crew member and they turn real for a few seconds
      let tap = 0;
      this.el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (e.timeStamp - tap < 380) { tap = 0; e.preventDefault(); this.real(); } else tap = e.timeStamp;
      });
    }
    // the hyperreal photo of them (assets/real, same frames as js/real.js): stare, smile, wave, glitch back
    async real() {
      if (this.realOn || !this.el.isConnected) return;
      const k = this.a.img, frame = (p) => `${base}assets/real/${k}/${p}.webp`;
      this.realOn = true;
      dispatchEvent(new CustomEvent('jb-real', { detail: 'start' }));
      await Promise.all(['stare', 'smile', 'wave1', 'wave2'].map((p) => { const i = new Image(); i.src = frame(p); return i.decode().catch(() => {}); }));
      const show = (p) => { this.el.src = frame(p); };
      const glitch = () => this.el.animate([{ opacity: 1, translate: '0 0' }, { opacity: .2, translate: '6px -3px' }, { opacity: 1, translate: '-6px 3px' }, { opacity: .4, translate: '3px 0' }, { opacity: 1, translate: '0 0' }],
        { duration: 280, easing: 'steps(5)' }).finished.catch(() => {});
      await glitch();
      this.lock = true;
      this.place();
      show('stare'); await wait(900);
      show('smile'); await wait(600);
      for (let i = 0; i < 6; i++) { show(i % 2 ? 'wave2' : 'wave1'); await wait(230); }
      show('smile'); await wait(450);
      await glitch();
      this.lock = false;
      this.realOn = false;
      if (this.el.isConnected) this.pose(this.p);
      dispatchEvent(new CustomEvent('jb-real', { detail: 'end' }));
    }
    has(p) { return !!this.a.frames[p]; }
    size(p = this.p) { if (this.lock) return [this.H * .95, this.H * .95]; const f = this.a.frames[p]; const h = this.H * f.s; return [h * f.w / f.h, h]; }
    pose(p) {
      if (!this.has(p)) p = 'stand';
      this.p = p;
      if (this.lock) { this.place(); return this; }
      const [w, h] = this.size(p);
      this.el.src = `${base}assets/anim/${this.a.img}/${p}.webp`;
      this.el.style.width = w + 'px';
      this.el.style.height = h + 'px';
      this.place();
      return this;
    }
    place() {
      const [w, h] = this.size();
      if (this.lock) { this.el.style.width = w + 'px'; this.el.style.height = h + 'px'; }
      this.el.style.transform = `translate(${this.x - w / 2}px,${this.feet - h}px) scaleX(${this.flip && !this.lock ? -1 : 1})`;
    }
    at(x, feet) { this.x = x; this.feet = feet; this.place(); return this; }
    face(right) { this.flip = !right; this.place(); return this; }
    // the mouth of the current pose, in layer coordinates (poses that have one)
    mouth() {
      const f = this.a.frames[this.p], [w, h] = this.size();
      const m = f.m || [.8, .25];
      return [this.x - w / 2 + (this.flip ? 1 - m[0] : m[0]) * w, this.feet - h + m[1] * h];
    }
    // walk (or run) to x along the ground, cycling the stride
    async walk(x, ms, run) {
      const from = this.x, t0 = performance.now(), cyc = ['walk1', 'walk3', 'walk2', 'walk3'];
      this.face(x >= from);
      let i = 0;
      for (;;) {
        const k = Math.min(1, (performance.now() - t0) / ms);
        this.pose(cyc[i++ % 4]);
        this.at(from + (x - from) * k, this.feet);
        if (k >= 1) break;
        await wait(run ? 70 : 110);
      }
      this.pose('stand');
    }
    // hop up (or down) onto something
    async hop(x, feet, ms = 320) {
      const x0 = this.x, f0 = this.feet, t0 = performance.now();
      this.pose('hop');
      await new Promise((res) => {
        const go = () => {
          const k = Math.min(1, (performance.now() - t0) / ms);
          this.at(x0 + (x - x0) * k, f0 + (feet - f0) * k - Math.sin(k * Math.PI) * this.H * .25);
          k < 1 ? requestAnimationFrame(go) : res();
        };
        go();
      });
    }
    // alternate two poses for a while (stroking, coughing)
    async loop(a, b, times, ms) {
      for (let i = 0; i < times; i++) { this.pose(i % 2 ? b : a); await wait(ms); }
    }
    shake(ms = 380, times = 3) {
      return this.el.animate([{ rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '5deg' }, { rotate: '0deg' }], { duration: ms, iterations: times }).finished;
    }
    remove() { this.el.remove(); }
  }
  const humanoids = Object.keys(A);

  // sounds shared by the bench and the antics (assets/sfx). Phones only let a script play an <audio>
  // that has already played inside a tap, so the first touch anywhere plays them all silently once.
  const clips = {};
  const clip = (name) => clips[name] || (clips[name] = Object.assign(new Audio(`${base}assets/sfx/${name}.mp3`), { preload: 'auto' }));
  const unlock = () => {
    ['cough', 'rip', 'lighter', 'punch'].forEach((n) => {
      const a = clip(n);
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
    });
    ['pointerdown', 'touchend', 'keydown'].forEach((t) => removeEventListener(t, unlock, true));
  };
  ['pointerdown', 'touchend', 'keydown'].forEach((t) => addEventListener(t, unlock, true));
  const play = (name) => { const a = clip(name); a.muted = false; a.currentTime = 0; a.play().catch(() => {}); };
  const hush = (name) => { if (clips[name]) clips[name].pause(); };

  // deal the crew like cards: everyone gets a turn before anyone comes back
  let deck = [];
  const cast = (not = []) => {
    if (!deck.length) deck = humanoids.slice().sort(() => Math.random() - .5);
    const i = deck.findIndex((s) => !not.includes(s));
    return i < 0 ? humanoids.find((s) => !not.includes(s)) : deck.splice(i, 1)[0];
  };
  window.JBCrewAnim = { Actor, humanoids, preload, wait, play, hush, cast };
})();
