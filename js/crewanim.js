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
    }
    has(p) { return !!this.a.frames[p]; }
    size(p = this.p) { const f = this.a.frames[p]; const h = this.H * f.s; return [h * f.w / f.h, h]; }
    pose(p) {
      if (!this.has(p)) p = 'stand';
      this.p = p;
      const [w, h] = this.size(p);
      this.el.src = `${base}assets/anim/${this.a.img}/${p}.webp`;
      this.el.style.width = w + 'px';
      this.el.style.height = h + 'px';
      this.place();
      return this;
    }
    place() {
      const [w, h] = this.size();
      this.el.style.transform = `translate(${this.x - w / 2}px,${this.feet - h}px) scaleX(${this.flip ? -1 : 1})`;
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
  window.JBCrewAnim = { Actor, humanoids, preload, wait };
})();
