/* Animated crew members: frame-by-frame poses (js/anim-data.js, tools/build_anim.py) on a positioned layer.
   An Actor stands with its feet at (x, feet), faces right unless flipped, and swaps poses like a flip-book.
   Getting around (walk, run, hop, glide) is a Web Animation of the `translate` property, so the compositor moves
   them every frame; only the flip-book pose swaps run on the main thread, and every pose is decoded before the
   first step so a swap never shows a blank frame. Used by the glass bench (the hit) and js/antics.js. */
(() => {
  const A = window.JB_ANIM;
  if (!A) return;
  const base = document.documentElement.dataset.base || '';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frameUrl = (a, p) => `${base}assets/anim/${a.img}/${p}.webp`;
  // every frame of a character, decoded once and held on to
  const held = [], ready = {};
  const preload = (slug) => {
    if (ready[slug]) return ready[slug];
    const a = A[slug];
    return (ready[slug] = Promise.all(Object.keys(a.frames).map((p) => {
      const i = new Image();
      i.decoding = 'async';
      i.src = frameUrl(a, p);
      held.push(i);
      return i.decode().catch(() => {});
    })));
  };
  // how far along a walk is (0..1) at time k (0..1): picks up speed, holds it, slows to a stop. A flat speed reads
  // as sliding on rails; this plants the first and the last step.
  const stride = (k, acc, dec) => {
    if (k <= 0) return 0;
    if (k >= 1) return 1;
    const v = 1 / (1 - acc / 2 - dec / 2);
    if (k < acc) return (v * k * k) / (2 * acc);
    if (k > 1 - dec) { const r = 1 - k; return 1 - (v * r * r) / (2 * dec); }
    return v * (k - acc / 2);
  };
  const WALK = ['walk1', 'walk3', 'walk2', 'walk3'];
  // let a Web Animation run out (or give up a little after it should have, if the element was pulled mid-way)
  const done = (an, ms) => Promise.race([an.finished.catch(() => {}), wait(ms + 120)]);

  class Actor {
    constructor(layer, slug, height) {
      this.a = A[slug];
      this.slug = slug;
      this.H = height;
      this.x = 0; this.feet = 0; this.flip = false;
      this.el = document.createElement('img');
      this.el.className = 'actor';
      this.el._actor = this;
      this.el.alt = '';
      this.el.draggable = false;
      this.el.decoding = 'sync'; // frames are decoded up front: each swap paints in the frame it's made
      layer.appendChild(this.el);
      this.ready = preload(slug);
      this.pose('stand');
      // double-click (or double-tap) a crew member and they turn real for a few seconds
      let tap = 0;
      this.el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (e.timeStamp - tap < 380) { tap = 0; e.preventDefault(); this.real(); } else tap = e.timeStamp;
      });
    }
    // the hyperreal photo of them (assets/real, same frames as js/real.js): stare, smile, wave, glitch back
    real() {
      if (this.realOn || !this.el.isConnected) return this.el._real;
      return (this.el._real = this._real().finally(() => { this.el._real = null; }));
    }
    async _real() {
      const k = this.a.img, frame = (p) => `${base}assets/real/${k}/${p}.webp`;
      this.realOn = true;
      dispatchEvent(new CustomEvent('jb-real', { detail: 'start' }));
      await Promise.all(['stare', 'smile', 'wave1', 'wave2'].map((p) => { const i = new Image(); i.src = frame(p); return i.decode().catch(() => {}); }));
      const show = (p) => { this._src = null; this.el.src = frame(p); };
      // added on top of any walk in progress, so the glitch doesn't yank them back to where the walk began
      const glitch = () => this.el.animate([{ opacity: 1, translate: '0 0' }, { opacity: .2, translate: '6px -3px' }, { opacity: 1, translate: '-6px 3px' }, { opacity: .4, translate: '3px 0' }, { opacity: 1, translate: '0 0' }],
        { duration: 280, easing: 'steps(5)', composite: 'add' }).finished.catch(() => {});
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
      const [w, h] = this.size(p), src = frameUrl(this.a, p);
      if (this._src !== src) { this._src = src; this.el.src = src; }
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
    // go to x along the ground. The body glides on the compositor; the legs flip-book in step with the ground
    // covered (a stride, four frames, is about .8 of their height), so the feet neither skate nor blur.
    // poses: the frames to cycle (one pose = carried, no legs). bob: px of bounce per step. also: elements carried
    // along exactly in step (they get the same translate); done(dx) runs just before it lets go, to settle them.
    async travel(x, ms, { run = false, poses = WALK, bob = 0, also = [], done: settle } = {}) {
      await this.ready;
      const dx = x - this.x, dist = Math.abs(dx), cyc = this.H * .8, legs = poses.length > 1;
      this.face(dx >= 0);
      this.pose(poses[0]);
      if (dist < 1) { if (settle) settle(0); return; }
      // the legs never go faster than a frame per 45ms: a far walk in a short time takes a little longer instead
      if (legs) ms = Math.max(ms, (dist / cyc) * 4 * 45);
      const acc = run ? .08 : .14, dec = run ? .12 : .2;
      // one bounce per step, but never more than one every 130ms
      const bumps = Math.min(dist / (cyc / 2), ms / 130);
      const n = Math.max(12, Math.ceil(ms / 30)), kf = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n, s = stride(k, acc, dec);
        const up = bob ? Math.abs(Math.sin(Math.PI * bumps * s)) * bob * Math.min(1, k / .1, (1 - k) / .1) : 0;
        kf.push({ translate: `${(dx * s).toFixed(2)}px ${(-up).toFixed(2)}px` });
      }
      const anims = [this.el, ...also].map((el) => el.animate(kf, { duration: ms, easing: 'linear', fill: 'forwards' }));
      if (legs) {
        const t0 = performance.now();
        await new Promise((res) => {
          let last = 0;
          const tick = () => {
            const k = (performance.now() - t0) / ms;
            if (k >= 1 || !this.el.isConnected) return res();
            const f = Math.floor((stride(k, acc, dec) * dist) / (cyc / 4));
            if (f !== last) { last = f; this.pose(poses[f % poses.length]); }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }
      await done(anims[0], ms);
      // hand the end position from the animation to the element itself in one go: no frame in between
      this.x = x;
      this.place();
      if (settle) settle(dx);
      anims.forEach((an) => an.cancel());
    }
    // walk (or run) to x along the ground, cycling the stride, and stop standing
    async walk(x, ms, run) {
      await this.travel(x, ms, { run });
      this.pose('stand');
    }
    // slide to x without stepping (shuffling something heavy along)
    async glide(x, ms = 400, easing = 'cubic-bezier(.65,0,.35,1)') {
      const dx = x - this.x;
      const an = this.el.animate([{ translate: '0 0' }, { translate: `${dx}px 0` }], { duration: ms, easing, fill: 'forwards' });
      await done(an, ms);
      this.x = x;
      this.place();
      an.cancel();
    }
    // hop up (or down) onto something
    async hop(x, feet, ms = 320) {
      await this.ready;
      const dx = x - this.x, dy = feet - this.feet, kf = [];
      for (let i = 0; i <= 16; i++) { const k = i / 16; kf.push({ translate: `${(dx * k).toFixed(2)}px ${(dy * k - Math.sin(k * Math.PI) * this.H * .25).toFixed(2)}px` }); }
      this.pose('hop');
      const an = this.el.animate(kf, { duration: ms, fill: 'forwards' });
      await done(an, ms);
      this.x = x; this.feet = feet;
      this.place();
      an.cancel();
    }
    // alternate two poses for a while (stroking, coughing)
    async loop(a, b, times, ms) {
      for (let i = 0; i < times; i++) { this.pose(i % 2 ? b : a); await wait(ms); }
    }
    shake(ms = 380, times = 3) {
      return this.el.animate([{ rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '5deg' }, { rotate: '0deg' }], { duration: ms, iterations: times, easing: 'ease-in-out' }).finished;
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
