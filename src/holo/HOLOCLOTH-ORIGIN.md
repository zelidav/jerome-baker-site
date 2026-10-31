# Holocloth (vendored)

Upstream: https://github.com/dmitrykurash/holocloth
Commit: a6078ba698a53cbf18be870cea555c1971f84103 (2026-07-22)
Vendored: 2026-10-31
License: MIT, see LICENSE in this folder (upstream notice kept unchanged)

Copied unchanged from upstream src/: scene.ts, cloth.ts, holoMaterial.ts, decals.ts, textures.ts, dofPass.ts, bakedPose.ts.
Not taken: App.tsx, main.tsx (React demo shell) and dialkit (the demo's control panel). Presets are hardcoded in presets.ts.

Ours: presets.ts (jb-foil, jb-poster), mount.ts (mountHoloCloth(el, opts), the one entry point).
Any later change to the vendored files gets noted below with the reason.

## Local changes
- cloth.ts: added crumple() and settle() (scrunch into a ball; ease back to the starting pose). Nothing existing changed. David OK'd physics changes 2026-10-31.
- holoMaterial.ts: added a uDieCut uniform (default 0, off) that discards cloth where the cloth image is transparent, so a sticker becomes a die-cut shape. Nothing existing changed.
