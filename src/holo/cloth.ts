import * as THREE from 'three';
import { BAKED_POSE } from './bakedPose.ts';

export interface ClothPhysicsParams {
  /** 0..0.6 — how fast motion dies out (gel viscosity). */
  viscosity: number;
  /** 0..1 — constraint solve strength. */
  stiffness: number;
  /** relaxation iterations per substep */
  iterations: number;
  /** 0..0.3 — laplacian smoothing, relaxes wrinkles back out */
  smoothing: number;
}

interface GrabState {
  indices: number[];
  weights: number[];
  /** offset of each grabbed vertex from the grab origin, 3 floats per entry */
  offsets: Float32Array;
  target: THREE.Vector3;
}

const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS = 4;

/**
 * Verlet cloth in zero gravity. No external forces — motion only comes from
 * user interaction, and heavy velocity damping makes it settle like it is
 * suspended in gel.
 */
export class ClothSim {
  readonly cols: number;
  readonly rows: number;
  readonly count: number;
  readonly positions: Float32Array;
  private prev: Float32Array;
  private rest: Float32Array;

  // constraints as flat arrays: [ia, ib] pairs + rest length + strength mul
  private cA: Int32Array;
  private cB: Int32Array;
  private cRest: Float32Array;
  private cMul: Float32Array;

  /** 4-neighborhood for laplacian smoothing: -1 padded */
  private neighbors: Int32Array;

  private grab: GrabState | null = null;
  private accumulator = 0;

  /** JB: outside forces for a cloth hung on a line (both 0 = upstream's zero-g gel) */
  readonly force = { gravity: 0, wind: 0 };
  private pinIdx: Int32Array | null = null;
  private pinPos: Float32Array | null = null;
  private time = 0;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly segX: number,
    readonly segY: number,
  ) {
    this.cols = segX + 1;
    this.rows = segY + 1;
    this.count = this.cols * this.rows;
    this.positions = new Float32Array(this.count * 3);
    this.prev = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);

    this.initPositions();

    // Build constraints: structural (1.0), shear (0.85), bend (0.35)
    const a: number[] = [];
    const b: number[] = [];
    const mul: number[] = [];
    const idx = (x: number, y: number) => y * this.cols + x;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (x + 1 < this.cols) { a.push(idx(x, y)); b.push(idx(x + 1, y)); mul.push(1.0); }
        if (y + 1 < this.rows) { a.push(idx(x, y)); b.push(idx(x, y + 1)); mul.push(1.0); }
        if (x + 1 < this.cols && y + 1 < this.rows) {
          a.push(idx(x, y)); b.push(idx(x + 1, y + 1)); mul.push(0.85);
          a.push(idx(x + 1, y)); b.push(idx(x, y + 1)); mul.push(0.85);
        }
        if (x + 2 < this.cols) { a.push(idx(x, y)); b.push(idx(x + 2, y)); mul.push(0.35); }
        if (y + 2 < this.rows) { a.push(idx(x, y)); b.push(idx(x, y + 2)); mul.push(0.35); }
      }
    }
    this.cA = new Int32Array(a);
    this.cB = new Int32Array(b);
    this.cMul = new Float32Array(mul);
    this.cRest = new Float32Array(a.length);
    this.computeRestLengths();

    this.neighbors = new Int32Array(this.count * 4).fill(-1);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = idx(x, y) * 4;
        this.neighbors[i + 0] = x > 0 ? idx(x - 1, y) : -1;
        this.neighbors[i + 1] = x + 1 < this.cols ? idx(x + 1, y) : -1;
        this.neighbors[i + 2] = y > 0 ? idx(x, y - 1) : -1;
        this.neighbors[i + 3] = y + 1 < this.rows ? idx(x, y + 1) : -1;
      }
    }
  }

  /**
   * Initial pose comes from a captured snapshot (BAKED_POSE): a
   * hand-arranged drape sampled bilinearly onto this grid, scaled to this
   * cloth's dimensions.
   */
  private initPositions() {
    const bp = BAKED_POSE;
    const bc = bp.cols;
    const br = bp.rows;
    const sx = this.width / bp.width;
    const sy = this.height / bp.height;
    const sz = (sx + sy) / 2;
    let k = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const gu = (x / this.segX) * (bc - 1);
        const gv = (y / this.segY) * (br - 1);
        const x0 = Math.min(bc - 2, Math.floor(gu));
        const y0 = Math.min(br - 2, Math.floor(gv));
        const fx = gu - x0;
        const fy = gv - y0;
        for (let c = 0; c < 3; c++) {
          const i00 = (y0 * bc + x0) * 3 + c;
          const i10 = (y0 * bc + x0 + 1) * 3 + c;
          const i01 = ((y0 + 1) * bc + x0) * 3 + c;
          const i11 = ((y0 + 1) * bc + x0 + 1) * 3 + c;
          const v0 = bp.data[i00] * (1 - fx) + bp.data[i10] * fx;
          const v1 = bp.data[i01] * (1 - fx) + bp.data[i11] * fx;
          const s = c === 0 ? sx : c === 1 ? sy : sz;
          this.positions[k + c] = (v0 * (1 - fy) + v1 * fy) * s;
        }
        k += 3;
      }
    }
    this.prev.set(this.positions);
    this.rest.set(this.positions);
  }

  private computeRestLengths() {
    // rest lengths come from the flat, unbillowed grid so the cloth
    // relaxes toward its true rectangle
    const stepX = this.width / this.segX;
    const stepY = this.height / this.segY;
    for (let c = 0; c < this.cA.length; c++) {
      const ia = this.cA[c], ib = this.cB[c];
      const ax = ia % this.cols, ay = Math.floor(ia / this.cols);
      const bx = ib % this.cols, by = Math.floor(ib / this.cols);
      const dx = (ax - bx) * stepX;
      const dy = (ay - by) * stepY;
      this.cRest[c] = Math.hypot(dx, dy);
    }
  }

  /** JB: lay the cloth out flat, facing the camera, and make that the rest pose. */
  flatten() {
    let k = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.positions[k++] = (x / this.segX - 0.5) * this.width;
        this.positions[k++] = (0.5 - y / this.segY) * this.height;
        this.positions[k++] = 0;
      }
    }
    this.prev.set(this.positions);
    this.rest.set(this.positions);
  }

  /** JB: clothespins. Each [u, v] (0..1 across the cloth) holds the nearest point where it is now. */
  pin(uv: Array<[number, number]>) {
    const idx = uv.map(([u, v]) => Math.round(v * this.segY) * this.cols + Math.round(u * this.segX));
    this.pinIdx = new Int32Array(idx);
    this.pinPos = new Float32Array(idx.length * 3);
    idx.forEach((i, k) => this.pinPos!.set(this.positions.subarray(i * 3, i * 3 + 3), k * 3));
  }

  unpin() {
    this.pinIdx = this.pinPos = null;
  }

  /** JB: the vertex nearest [u, v], for following a spot on the cloth */
  vertexAt(u: number, v: number) {
    return Math.round(Math.min(1, Math.max(0, v)) * this.segY) * this.cols + Math.round(Math.min(1, Math.max(0, u)) * this.segX);
  }

  reset() {
    this.initPositions();
    this.grab = null;
  }

  /** JB: scrunch the whole cloth into a ball around its centre; the constraints burst it back open. */
  crumple(amount = 0.82) {
    const p = this.positions, n = this.count;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += p[i * 3]; cy += p[i * 3 + 1]; cz += p[i * 3 + 2]; }
    cx /= n; cy /= n; cz /= n;
    const k = 1 - amount, j = Math.max(this.width, this.height) * 0.06;
    for (let i = 0; i < n; i++) {
      p[i * 3] = cx + (p[i * 3] - cx) * k + (Math.random() - 0.5) * j;
      p[i * 3 + 1] = cy + (p[i * 3 + 1] - cy) * k + (Math.random() - 0.5) * j;
      p[i * 3 + 2] = cz + (p[i * 3 + 2] - cz) * k + (Math.random() - 0.5) * j * 2;
    }
    this.prev.set(p);
    this.grab = null;
  }

  /** JB: pull every point a fraction t of the way back to the starting pose (call per frame to snap back). */
  settle(t: number) {
    const p = this.positions, r = this.rest;
    for (let i = 0; i < p.length; i++) p[i] += (r[i] - p[i]) * t;
    this.prev.set(p);
  }

  /** Give a random gentle impulse — a "poke" from nowhere. */
  poke(strength = 0.5) {
    const p = this.positions;
    const ci = Math.floor(Math.random() * this.count);
    const cx = p[ci * 3], cy = p[ci * 3 + 1], cz = p[ci * 3 + 2];
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize().multiplyScalar(strength * 0.09);
    const radius = Math.max(this.width, this.height) * 0.28;
    for (let i = 0; i < this.count; i++) {
      const dx = p[i * 3] - cx, dy = p[i * 3 + 1] - cy, dz = p[i * 3 + 2] - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) continue;
      const w = 1 - d / radius;
      const s = w * w * (3 - 2 * w); // smoothstep
      this.prev[i * 3] -= dir.x * s;
      this.prev[i * 3 + 1] -= dir.y * s;
      this.prev[i * 3 + 2] -= dir.z * s;
    }
  }

  /** Begin a grab around a world-space point. Returns false if nothing near. */
  startGrab(point: THREE.Vector3, radius: number): boolean {
    const p = this.positions;
    const indices: number[] = [];
    const weights: number[] = [];
    const offsets: number[] = [];
    let best = Infinity;
    for (let i = 0; i < this.count; i++) {
      const dx = p[i * 3] - point.x;
      const dy = p[i * 3 + 1] - point.y;
      const dz = p[i * 3 + 2] - point.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      best = Math.min(best, d);
      if (d > radius) continue;
      const t = 1 - d / radius;
      const w = t * t * (3 - 2 * t);
      indices.push(i);
      weights.push(w);
      offsets.push(dx, dy, dz);
    }
    if (indices.length === 0 || best > radius) return false;
    this.grab = {
      indices,
      weights,
      offsets: new Float32Array(offsets),
      target: point.clone(),
    };
    return true;
  }

  moveGrab(target: THREE.Vector3) {
    if (this.grab) this.grab.target.copy(target);
  }

  endGrab() {
    this.grab = null;
  }

  get isGrabbing() {
    return this.grab !== null;
  }

  private cavityScratch: Float32Array | null = null;

  /**
   * Per-vertex cavity term for ambient occlusion: how deeply a vertex sits
   * inside a concave fold. Uses the discrete Laplacian projected onto the
   * vertex normal — concave (valley) vertices score > 0 — then one smoothing
   * pass to avoid grid artifacts. Writes [0,1] into `out`.
   */
  computeCavity(normals: ArrayLike<number>, out: Float32Array, gain = 6) {
    const p = this.positions;
    const nb = this.neighbors;
    const n = this.count;
    const invStep = 1 / Math.min(this.width / this.segX, this.height / this.segY);
    if (!this.cavityScratch || this.cavityScratch.length < n) {
      this.cavityScratch = new Float32Array(n);
    }
    const tmp = this.cavityScratch;
    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0, az = 0, cnt = 0;
      for (let j = 0; j < 4; j++) {
        const ni = nb[i * 4 + j];
        if (ni < 0) continue;
        ax += p[ni * 3]; ay += p[ni * 3 + 1]; az += p[ni * 3 + 2];
        cnt++;
      }
      if (cnt === 0) { tmp[i] = 0; continue; }
      const inv = 1 / cnt;
      const lx = ax * inv - p[i * 3];
      const ly = ay * inv - p[i * 3 + 1];
      const lz = az * inv - p[i * 3 + 2];
      const c = (lx * normals[i * 3] + ly * normals[i * 3 + 1] + lz * normals[i * 3 + 2]) * invStep;
      tmp[i] = Math.min(1, Math.max(0, c * gain));
    }
    // soften: blend each vertex with its neighborhood average
    for (let i = 0; i < n; i++) {
      let sum = 0, cnt = 0;
      for (let j = 0; j < 4; j++) {
        const ni = nb[i * 4 + j];
        if (ni < 0) continue;
        sum += tmp[ni];
        cnt++;
      }
      out[i] = cnt > 0 ? tmp[i] * 0.5 + (sum / cnt) * 0.5 : tmp[i];
    }
  }

  step(dt: number, params: ClothPhysicsParams) {
    this.accumulator += Math.min(dt, 0.05);
    let steps = 0;
    while (this.accumulator >= SUBSTEP && steps < MAX_SUBSTEPS) {
      this.substep(params);
      this.accumulator -= SUBSTEP;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0;
  }

  private substep(params: ClothPhysicsParams) {
    const p = this.positions;
    const prev = this.prev;
    const n = this.count;

    // integrate: damping expressed per 60Hz-frame, converted to substep rate
    const damp = Math.pow(1 - Math.min(params.viscosity, 0.99), SUBSTEP * 60);
    for (let i = 0; i < n * 3; i++) {
      const cur = p[i];
      const vel = (cur - prev[i]) * damp;
      prev[i] = cur;
      p[i] = cur + vel;
    }

    // JB: gravity plus a gusty breeze, mostly sideways with some flutter toward and away from the camera
    const { gravity, wind } = this.force;
    if (gravity || wind) {
      this.time += SUBSTEP;
      const t = this.time, dt2 = SUBSTEP * SUBSTEP;
      const gust = wind * (0.55 + 0.3 * Math.sin(t * 0.9) + 0.2 * Math.sin(t * 2.3 + 1.0));
      for (let i = 0; i < n; i++) {
        const x = p[i * 3], y = p[i * 3 + 1];
        const flutter = Math.sin(t * 5.1 + x * 2.3 + y * 1.7) + 0.6 * Math.sin(t * 8.3 - y * 3.1 + x);
        p[i * 3] += gust * (0.8 + 0.25 * Math.sin(t * 1.9 + y * 2.0)) * dt2;
        p[i * 3 + 1] -= gravity * dt2;
        p[i * 3 + 2] += gust * 0.9 * flutter * dt2;
      }
    }

    // laplacian smoothing — wrinkles relax back out, gel-like
    if (params.smoothing > 0) {
      const k = params.smoothing * 0.5;
      const nb = this.neighbors;
      for (let i = 0; i < n; i++) {
        let ax = 0, ay = 0, az = 0, cnt = 0;
        for (let j = 0; j < 4; j++) {
          const ni = nb[i * 4 + j];
          if (ni < 0) continue;
          ax += p[ni * 3]; ay += p[ni * 3 + 1]; az += p[ni * 3 + 2];
          cnt++;
        }
        if (cnt === 0) continue;
        const inv = 1 / cnt;
        p[i * 3] += (ax * inv - p[i * 3]) * k;
        p[i * 3 + 1] += (ay * inv - p[i * 3 + 1]) * k;
        p[i * 3 + 2] += (az * inv - p[i * 3 + 2]) * k;
      }
    }

    // constraint relaxation
    const iters = Math.max(1, Math.round(params.iterations));
    const stiff = params.stiffness;
    const cA = this.cA, cB = this.cB, cRest = this.cRest, cMul = this.cMul;
    const nc = cA.length;
    for (let it = 0; it < iters; it++) {
      for (let c = 0; c < nc; c++) {
        const ia = cA[c] * 3, ib = cB[c] * 3;
        const dx = p[ib] - p[ia];
        const dy = p[ib + 1] - p[ia + 1];
        const dz = p[ib + 2] - p[ia + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1e-9) continue;
        const diff = ((d - cRest[c]) / d) * 0.5 * stiff * cMul[c];
        const ox = dx * diff, oy = dy * diff, oz = dz * diff;
        p[ia] += ox; p[ia + 1] += oy; p[ia + 2] += oz;
        p[ib] -= ox; p[ib + 1] -= oy; p[ib + 2] -= oz;
      }
      this.applyGrab();
      this.applyPins();
    }
  }

  private applyPins() {
    const idx = this.pinIdx, pos = this.pinPos;
    if (!idx || !pos) return;
    const p = this.positions;
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k] * 3;
      p[i] = pos[k * 3]; p[i + 1] = pos[k * 3 + 1]; p[i + 2] = pos[k * 3 + 2];
    }
  }

  private applyGrab() {
    const g = this.grab;
    if (!g) return;
    const p = this.positions;
    for (let k = 0; k < g.indices.length; k++) {
      const i = g.indices[k] * 3;
      const w = g.weights[k];
      const tx = g.target.x + g.offsets[k * 3];
      const ty = g.target.y + g.offsets[k * 3 + 1];
      const tz = g.target.z + g.offsets[k * 3 + 2];
      p[i] += (tx - p[i]) * w;
      p[i + 1] += (ty - p[i + 1]) * w;
      p[i + 2] += (tz - p[i + 2]) * w;
    }
  }
}
