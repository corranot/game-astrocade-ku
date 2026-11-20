// PROTOTYPE - NOT FOR PRODUCTION
// Cel shading for every lit surface: MeshToonMaterial with one shared three-step light ramp, so light falls in
// flat bands like a cartoon. The thin black outline is drawn after the scene by game.js (an edge pass).
/* global THREE */ // Three.js r187, set on window by index.html before run()

let ramp = null;
/** The shared light ramp: shadow, mid and lit bands (nearest filtering keeps the steps hard). */
export function toonRamp() {
  if (!ramp) {
    const d = new Uint8Array([120, 190, 255]);
    ramp = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.generateMipmaps = false; ramp.needsUpdate = true;
  }
  return ramp;
}

const NOT_TOON = ['roughness', 'metalness', 'clearcoat', 'clearcoatRoughness', 'envMapIntensity', 'flatShading', 'specular', 'shininess'];
/** A toon material from the same options a standard or lambert one would take (PBR-only options are dropped). */
export function toon(opts = {}) {
  const o = { ...opts };
  for (const k of NOT_TOON) delete o[k];
  return new THREE.MeshToonMaterial({ gradientMap: toonRamp(), ...o });
}
