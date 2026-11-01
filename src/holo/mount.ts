// One mount for the vendored holocloth engine: mountHoloCloth(el, opts) wraps new HoloApp(host).
// The site is plain HTML, so this is the whole public surface; esbuild bundles it to js/holo/holo.js.
import { HoloApp } from './scene.ts';
import { PRESETS, type PresetName } from './presets.ts';

export interface HoloClothOptions {
  /** the artwork the cloth is printed with (URL or a loaded image) */
  clothImage?: string | HTMLImageElement;
  /** images laid on top of the cloth, e.g. the JB logo */
  decals?: Array<string | HTMLImageElement | { src: string | HTMLImageElement; u?: number; v?: number; scale?: number; rotation?: number }>;
  preset?: PresetName;
  /** grab and drag the cloth (and orbit); off = look only */
  interactive?: boolean;
  /** give it a poke as soon as it's on screen */
  pokeOnEnter?: boolean;
  /** no studio background: the page shows through around the cloth */
  transparentBg?: boolean;
  /** after it's been left alone this long (ms), it eases back to its starting shape; false = stays put */
  snapBack?: number | false;
  /** cut the cloth to the cloth image's outline (transparent PNG/WebP stickers) */
  dieCut?: boolean;
  /** double-click / double-tap crumples it into a ball */
  crumpleOnDoubleTap?: boolean;
  /** 'High' | 'Medium' | 'Low' (upstream's performance profiles) */
  performance?: 'High' | 'Medium' | 'Low';
  /** CSS touch-action on the canvas; 'pan-y' lets a phone scroll the page through it (drag sideways to grab). */
  touchAction?: string;
  onReady?: (api: HoloClothHandle) => void;
}

export interface HoloClothHandle {
  app: HoloApp;
  poke: (strength?: number) => void;
  crumple: () => void;
  snapBack: (ms?: number) => Promise<void>;
  setPreset: (name: PresetName) => void;
  setClothImage: (src: string | HTMLImageElement) => Promise<void>;
  addDecal: (src: string | HTMLImageElement) => Promise<void>;
  /** stop / restart the render loop (e.g. when scrolled off screen) */
  pause: () => void;
  resume: () => void;
  dispose: () => void;
}

const load = (src: string | HTMLImageElement): Promise<HTMLImageElement> => {
  if (typeof src !== 'string') return src.complete ? Promise.resolve(src) : src.decode().then(() => src);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = src;
  return img.decode().then(() => img);
};

// bump sources drawn in a canvas, so no big texture downloads: fine scratches for foil, a basket weave for cloth
const bumpImage = (kind: 'scratch' | 'weave'): Promise<HTMLImageElement> => {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 512, 512);
  if (kind === 'weave') {
    const s = 16;
    for (let y = 0; y < 512; y += s) {
      for (let x = 0; x < 512; x += s) {
        const over = ((x / s) + (y / s)) % 2 === 0;
        const grad = over ? g.createLinearGradient(x, y, x, y + s) : g.createLinearGradient(x, y, x + s, y);
        grad.addColorStop(0, '#3a3a3a'); grad.addColorStop(.5, '#e0e0e0'); grad.addColorStop(1, '#3a3a3a');
        g.fillStyle = grad;
        g.fillRect(x + 1, y + 1, s - 2, s - 2);
      }
    }
  } else {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const x = rnd() * 512, y = rnd() * 512, a = rnd() * Math.PI, l = 8 + rnd() * 60;
      g.strokeStyle = rnd() < .5 ? `rgba(255,255,255,${.1 + rnd() * .3})` : `rgba(0,0,0,${.1 + rnd() * .3})`;
      g.lineWidth = .5 + rnd();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  }
  return load(c.toDataURL('image/png'));
};

export function mountHoloCloth(el: HTMLElement, opts: HoloClothOptions = {}): HoloClothHandle {
  const app = new HoloApp(el);
  // engine internals the wrapper needs (TS-private upstream, untouched)
  const raw = app as unknown as {
    renderer: import('three').WebGLRenderer; scene: import('three').Scene; tick: () => void;
    controls: { enabled: boolean }; holoUniforms: { uRadialFreq: { value: number }; uDieCut: { value: number } }; surface: { decals: Array<{ u: number; v: number; scale: number; rotation: number }>; redraw: () => void };
  };
  const canvas = raw.renderer.domElement;
  let preset: PresetName = opts.preset || 'jb-foil';
  let disposed = false;

  const apply = () => {
    const p = structuredClone(PRESETS[preset].params);
    if (opts.performance) p.performance = opts.performance;
    // over the page there is no backdrop for grain or bloom to sit on; they only tint the empty area
    if (opts.transparentBg) { p.render.noise = 0; p.render.bloom = 0; }
    app.applyParams(p);
    raw.holoUniforms.uRadialFreq.value = PRESETS[preset].radialFreq;
    raw.holoUniforms.uDieCut.value = opts.dieCut ? 1 : 0;
    if (opts.transparentBg) { raw.scene.background = null; raw.renderer.setClearColor(0x000000, 0); }
  };

  type Sim = { poke: (n: number) => void; crumple: () => void; settle: (t: number) => void };
  const sim = () => (app as unknown as { sim: Sim }).sim;
  // snap back to the starting shape a few seconds after the last touch
  let idleT = 0;
  const idle = () => {
    clearTimeout(idleT);
    if (opts.snapBack === false || disposed) return;
    idleT = window.setTimeout(() => handle.snapBack(900), opts.snapBack ?? 3500);
  };
  let lastTap = 0;
  canvas.addEventListener('pointerdown', (e) => {
    clearTimeout(idleT);
    if (opts.crumpleOnDoubleTap && e.timeStamp - lastTap < 350) { lastTap = 0; handle.crumple(); return; }
    lastTap = e.timeStamp;
  });
  canvas.addEventListener('pointerup', idle);
  canvas.addEventListener('pointercancel', idle);

  const interactive = opts.interactive !== false;
  raw.controls.enabled = interactive;
  canvas.style.touchAction = opts.touchAction || (interactive ? 'none' : 'pan-y');
  if (!interactive) canvas.style.pointerEvents = 'none';

  const handle: HoloClothHandle = {
    app,
    poke: (s = 1) => sim().poke(s),
    crumple: () => { sim().crumple(); idle(); },
    snapBack: (ms = 700) => new Promise((done) => {
      const t0 = performance.now();
      const go = () => {
        if (disposed) return done();
        const k = Math.min(1, (performance.now() - t0) / ms);
        // ease-out: each frame closes a growing share of what's left
        sim().settle(k >= 1 ? 1 : 0.06 + 0.25 * k * k);
        k < 1 ? requestAnimationFrame(go) : done();
      };
      go();
    }),
    setPreset: (name) => {
      preset = name;
      apply();
      bumpImage(PRESETS[name].bump).then((img) => { if (!disposed) app.setBumpMap(img); });
    },
    setClothImage: async (src) => { const img = await load(src); if (!disposed) app.setClothImage(img); },
    addDecal: async (src) => { const img = await load(src); if (!disposed) app.addDecal(img); },
    pause: () => raw.renderer.setAnimationLoop(null),
    resume: () => { if (!disposed) raw.renderer.setAnimationLoop(raw.tick); },
    dispose: () => { if (disposed) return; disposed = true; clearTimeout(idleT); app.dispose(); },
  };

  apply();
  (async () => {
    const [bump, cloth] = await Promise.all([bumpImage(PRESETS[preset].bump), opts.clothImage ? load(opts.clothImage) : null]);
    if (disposed) return;
    app.setBumpMap(bump);
    if (cloth) app.setClothImage(cloth);
    for (const d of opts.decals || []) {
      const spec = typeof d === 'object' && 'src' in d && !(d instanceof HTMLImageElement) ? d : { src: d as string | HTMLImageElement };
      const img = await load(spec.src);
      if (disposed) return;
      app.addDecal(img);
      const item = raw.surface.decals[raw.surface.decals.length - 1];
      Object.assign(item, { ...(spec.u != null && { u: spec.u }), ...(spec.v != null && { v: spec.v }), ...(spec.scale != null && { scale: spec.scale }), ...(spec.rotation != null && { rotation: spec.rotation }) });
      raw.surface.redraw();
    }
    apply();  // setClothImage rebuilds the cloth; re-assert params
    app.reveal();
    if (opts.pokeOnEnter) handle.poke(1);
    opts.onReady?.(handle);
  })().catch((e) => console.error('[holo] assets failed', e));

  return handle;
}

// the bundle hangs this on window so plain-HTML pages can call it
(window as unknown as { JBHolo: unknown }).JBHolo = { mountHoloCloth, PRESETS };
