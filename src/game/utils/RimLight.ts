import * as THREE from 'three';

const patched = new WeakSet<THREE.Material>();

/**
 * Adds a coloured fresnel edge glow to every lit material under `root`,
 * so characters separate from the dark ground at any camera angle.
 */
export function applyRimLight(root: THREE.Object3D, color: number, intensity: number = 1.0, power: number = 2.6): void {
  const rimColor = new THREE.Color(color);

  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial) || patched.has(material)) continue;
      patched.add(material);

      material.onBeforeCompile = shader => {
        shader.uniforms.uRimColor = { value: rimColor };
        shader.uniforms.uRimIntensity = { value: intensity };
        shader.uniforms.uRimPower = { value: power };
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
            uniform vec3 uRimColor;
            uniform float uRimIntensity;
            uniform float uRimPower;`)
          .replace('#include <opaque_fragment>', `
            float rimFactor = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), uRimPower);
            outgoingLight += uRimColor * rimFactor * uRimIntensity;
            #include <opaque_fragment>`);
      };
      material.customProgramCacheKey = () => `rim-${color}-${intensity}-${power}`;
      material.needsUpdate = true;
    }
  });
}
