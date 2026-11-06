import * as THREE from 'three';

/** Shared clock for all wind-animated foliage. Advanced once per frame by GameScene. */
export const windTime = { value: 0 };

/** Makes a material sway gently, more strongly the higher a vertex sits on its tree. */
export function applyWind(material: THREE.MeshStandardMaterial, strength: number = 0.05): void {
  material.onBeforeCompile = shader => {
    shader.uniforms.uWindTime = windTime;
    shader.uniforms.uWindStrength = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uWindTime;
        uniform float uWindStrength;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float windHeight = max(position.y - 1.5, 0.0);
        float windPhase = modelMatrix[3].x * 0.7 + modelMatrix[3].z * 0.5 + position.y * 0.4;
        transformed.x += sin(uWindTime * 1.1 + windPhase) * windHeight * uWindStrength;
        transformed.z += cos(uWindTime * 0.9 + windPhase * 1.3) * windHeight * uWindStrength * 0.7;`);
  };
  material.customProgramCacheKey = () => `wind-${strength}`;
}
