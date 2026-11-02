// JB presets for the vendored holocloth engine (scene.ts). Every field maps 1:1 onto HoloParams;
// render settings are upstream's RENDER_DEFAULTS. The engine's hue wheel runs red 0 → yellow ~0.17,
// and each band sweeps hueShift + facing * bandFreq, so a narrow sweep that starts just under red
// keeps the foil in JB red → orange → yellow instead of the full rainbow.
import type { HoloParams } from './scene.ts';

export type PresetName = 'jb-foil' | 'jb-poster' | 'jb-sticker' | 'jb-fabric';

const RENDER: HoloParams['render'] = {
  background: '#0b0c12',
  exposure: 0.5,
  environment: 0.73,
  bloom: 0.05,
  bloomThreshold: 1.41,
  noise: 0.03,
  toneMapping: 'Neutral',
  occlusion: true,
  occlusionStrength: 1,
  dof: false,
  dofAperture: 40,
  dofBlur: 0.04,
  dofRange: 0.3,
};

// upstream's physics defaults
const PHYSICS: HoloParams['physics'] = { viscosity: 0.6, stiffness: 1, iterations: 14, smoothing: 0.045, grabRadius: 0.27 };

const IMAGES: HoloParams['images'] = { edit: false, useImage: true, scale: 0.35, rotation: 0, opacity: 1, cornerRadius: 0 };

// radialFreq drives the engine's uRadialFreq uniform (upstream default 1.6, not in HoloParams): how far the hue
// sweeps from the centre of the cloth out. Low = the bands stay in one slice of the wheel.
export const PRESETS: Record<PresetName, { params: HoloParams; bump: 'scratch' | 'weave' | 'pique'; radialFreq: number }> = {
  // a real holo sticker: the art stays true, whites stay white, a silvery full-rainbow sheen runs across it as it bends
  'jb-sticker': {
    bump: 'scratch',
    radialFreq: 1.6,
    params: {
      performance: 'High',
      physics: PHYSICS,
      material: {
        preset: 'jb-sticker',
        finish: 'Glossy',
        baseColor: '#e9ecf2',
        holoIntensity: 0.55,
        holoScale: 260,
        bandFreq: 1.1,
        saturation: 0.75,
        hueShift: 0.37,
        sparkle: 0.9,
        specTint: 0.12,
        iridescence: 0.6,
        roughness: 0.2,
        metalness: 0.2,
        clearcoat: 1,
        coatRoughness: 0.06,
        sheen: 0,
        bump: 0.35,
        bumpTiling: 3,
      },
      images: { ...IMAGES, opacity: 1 },
      render: { ...RENDER, exposure: 0.95, environment: 0.9 },
    },
  },
  // navy foil, bands pushed toward JB yellow/red, high iridescence, clearcoat on, moderate sparkle
  'jb-foil': {
    bump: 'scratch',
    radialFreq: 0.2,
    params: {
      performance: 'High',
      physics: PHYSICS,
      material: {
        preset: 'jb-foil',
        finish: 'Glossy',
        baseColor: '#233671',
        holoIntensity: 0.9,
        holoScale: 300,
        bandFreq: 0.16,
        saturation: 1,
        hueShift: 0.88,
        sparkle: 0.7,
        specTint: 0.55,
        iridescence: 0.7,
        roughness: 0.22,
        metalness: 0.55,
        clearcoat: 1,
        coatRoughness: 0.08,
        sheen: 0,
        bump: 0.6,
        bumpTiling: 3,
      },
      images: { ...IMAGES, opacity: 1 },
      render: RENDER,
    },
  },
  // real shirt fabric (cotton pique): soft and matte, a fine knit, cotton sheen, only a whisper of holo.
  // Light damping and softer constraints so it hangs and flaps in a breeze instead of floating in gel.
  'jb-fabric': {
    bump: 'pique',
    radialFreq: 1.2,
    params: {
      performance: 'High',
      physics: { viscosity: 0.035, stiffness: 0.9, iterations: 12, smoothing: 0.008, grabRadius: 0.3 },
      material: {
        preset: 'jb-fabric',
        finish: 'Matte',
        baseColor: '#ffffff',
        holoIntensity: 0.07,
        holoScale: 140,
        bandFreq: 0.5,
        saturation: 0.5,
        hueShift: 0.94,
        sparkle: 0,
        specTint: 0,
        iridescence: 0.08,
        roughness: 0.92,
        metalness: 0,
        clearcoat: 0,
        coatRoughness: 1,
        sheen: 0.25,
        bump: 0.7,
        bumpTiling: 26,
      },
      images: { ...IMAGES, opacity: 1 },
      render: { ...RENDER, exposure: 0.62, environment: 0.55, occlusionStrength: 1.4 },
    },
  },
  // the artwork at full opacity on cloth: light holo, strong bump from a weave normal map
  'jb-poster': {
    bump: 'weave',
    radialFreq: 1.6,
    params: {
      performance: 'High',
      physics: PHYSICS,
      material: {
        preset: 'jb-poster',
        finish: 'Matte',
        baseColor: '#f1f1f1',
        holoIntensity: 0.5,
        holoScale: 120,
        bandFreq: 0.6,
        saturation: 0.6,
        hueShift: 0.94,
        sparkle: 0.1,
        specTint: 0.1,
        iridescence: 0.2,
        roughness: 0.8,
        metalness: 0.05,
        clearcoat: 0.05,
        coatRoughness: 0.6,
        sheen: 0.35,
        bump: 2.5,
        bumpTiling: 8,
      },
      images: { ...IMAGES, opacity: 1 },
      render: RENDER,
    },
  },
};
