import * as THREE from 'three';

const FLASH_DECAY = 9;

/**
 * Per-character shader controls: a white flash on being hit, and a red pulse
 * while winding up an attack.
 */
export class CharacterGlow {
  public readonly flashUniform = { value: 0 };
  public readonly warningUniform = { value: 0 };

  public flash(strength: number = 1): void {
    this.flashUniform.value = Math.max(this.flashUniform.value, strength);
  }

  /** 0 for off, up to 1 just before the attack lands. */
  public setWarning(amount: number): void {
    this.warningUniform.value = amount;
  }

  public update(dt: number): void {
    this.flashUniform.value *= Math.exp(-FLASH_DECAY * dt);
  }
}

const patched = new WeakSet<THREE.Material>();

/**
 * Adds a coloured fresnel edge glow to every lit material under `root`, so
 * characters separate from the dark ground at any camera angle.
 *
 * With `uniqueMaterials`, each mesh gets its own copy of its material, so that
 * flashing one enemy doesn't flash every other enemy of the same type.
 */
export function applyRimLight(
  root: THREE.Object3D,
  color: number,
  intensity: number = 1.0,
  options: { uniqueMaterials?: boolean } = {},
): CharacterGlow {
  const power = 2.6;
  const rimColor = new THREE.Color(color);
  const glow = new CharacterGlow();
  const clones = new Map<THREE.Material, THREE.Material>();

  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;

    if (options.uniqueMaterials) {
      let clone = clones.get(mesh.material);
      if (!clone) {
        clone = mesh.material.clone();
        clones.set(mesh.material, clone);
      }
      mesh.material = clone;
    }

    const material = mesh.material as THREE.MeshStandardMaterial;
    if (patched.has(material)) return;
    patched.add(material);

    material.onBeforeCompile = shader => {
      shader.uniforms.uRimColor = { value: rimColor };
      shader.uniforms.uRimIntensity = { value: intensity };
      shader.uniforms.uRimPower = { value: power };
      shader.uniforms.uHitFlash = glow.flashUniform;
      shader.uniforms.uWarning = glow.warningUniform;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform vec3 uRimColor;
          uniform float uRimIntensity;
          uniform float uRimPower;
          uniform float uHitFlash;
          uniform float uWarning;`)
        .replace('#include <opaque_fragment>', `
          float rimFactor = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), uRimPower);
          outgoingLight += uRimColor * rimFactor * uRimIntensity;
          outgoingLight += vec3(1.0, 0.93, 0.86) * uHitFlash * 1.5;
          outgoingLight += vec3(1.0, 0.16, 0.05) * uWarning * (0.3 + rimFactor * 2.2);
          #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => 'character-glow';
    material.needsUpdate = true;
  });

  return glow;
}
