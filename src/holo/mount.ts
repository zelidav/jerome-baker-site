// One mount for the vendored holocloth engine: mountHoloCloth(el, opts) wraps new HoloApp(host).
// The site is plain HTML, so this is the whole public surface; esbuild bundles it to js/holo/holo.js.
import * as THREE from 'three';
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
  /** hang it on a line: clothespins at [u, v] spots (0..1 across the image), gravity, and a breeze */
  hang?: { pins: Array<[number, number]>; wind?: number; gravity?: number };
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
  /** breeze strength (hung cloth only) */
  wind: (n: number) => void;
  /** take the clothespins off */
  release: () => void;
  /** grab the cloth at [u, v]; pullTo then drags that spot to a point on screen; letGo drops it */
  grabAt: (u: number, v: number) => void;
  pullTo: (clientX: number, clientY: number) => void;
  letGo: () => void;
  /** where [u, v] on the cloth is on screen right now (client px) */
  screenAt: (u: number, v: number) => { x: number; y: number };
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
const bumpImage = (kind: 'scratch' | 'weave' | 'pique'): Promise<HTMLImageElement> => {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 512, 512);
  if (kind === 'pique') {
    // a polo's knit: tiny raised cells in offset rows
    const s = 8;
    for (let y = 0; y < 512; y += s) {
      for (let x = (y / s) % 2 ? s / 2 : 0; x < 512; x += s) {
        const grad = g.createRadialGradient(x + s / 2, y + s / 2, 0, x + s / 2, y + s / 2, s * 0.6);
        grad.addColorStop(0, '#d8d8d8'); grad.addColorStop(1, '#4a4a4a');
        g.fillStyle = grad;
        g.fillRect(x, y, s, s);
      }
    }
  } else if (kind === 'weave') {
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
    camera: import('three').PerspectiveCamera;
    controls: { enabled: boolean; enableRotate: boolean; target: import('three').Vector3; update: () => void }; holoUniforms: { uRadialFreq: { value: number }; uDieCut: { value: number } }; surface: { decals: Array<{ u: number; v: number; scale: number; rotation: number }>; redraw: () => void };
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

  type Sim = import('./cloth.ts').ClothSim;
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
    wind: (n) => { sim().force.wind = n; },
    release: () => sim().unpin(),
    grabAt: (u, v) => {
      const s = sim(), i = s.vertexAt(u, v) * 3;
      s.startGrab(new THREE.Vector3(s.positions[i], s.positions[i + 1], s.positions[i + 2]), 0.32);
    },
    pullTo: (cx, cy) => {
      // onto the plane through the cloth's middle, facing the camera
      const r = canvas.getBoundingClientRect(), cam = raw.camera;
      cam.updateMatrixWorld();
      const ndc = new THREE.Vector3(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0.5).unproject(cam);
      const dir = ndc.sub(cam.position).normalize();
      const t = -cam.position.z / dir.z;
      sim().moveGrab(cam.position.clone().addScaledVector(dir, t));
    },
    letGo: () => sim().endGrab(),
    screenAt: (u, v) => {
      const s = sim(), i = s.vertexAt(u, v) * 3, r = canvas.getBoundingClientRect();
      raw.camera.updateMatrixWorld();
      const p = new THREE.Vector3(s.positions[i], s.positions[i + 1], s.positions[i + 2]).project(raw.camera);
      return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
    },
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
    if (opts.hang) {
      // straight on, flat, pinned at the top, then let gravity and the breeze have it
      const s = sim();
      s.flatten();
      s.pin(opts.hang.pins);
      s.force.gravity = opts.hang.gravity ?? 9;
      s.force.wind = opts.hang.wind ?? 6;
      raw.camera.position.set(0, 0.15, 5.6);
      raw.controls.target.set(0, -0.1, 0);
      raw.controls.enableRotate = false;
      raw.controls.update();
    }
    app.reveal();
    if (opts.pokeOnEnter) handle.poke(1);
    opts.onReady?.(handle);
  })().catch((e) => console.error('[holo] assets failed', e));

  return handle;
}

// the bundle hangs this on window so plain-HTML pages can call it
(window as unknown as { JBHolo: unknown }).JBHolo = { mountHoloCloth, PRESETS };
