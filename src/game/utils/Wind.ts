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

/** Chains a new onBeforeCompile after any existing one, and folds both into the cache key. */
function chain(material: THREE.Material, key: string, patch: (shader: THREE.WebGLProgramParametersWithUniforms) => void): void {
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    patch(shader);
  };
  material.customProgramCacheKey = () => `${previousKey ? previousKey() : ''}|${key}`;
  material.needsUpdate = true;
}

/**
 * Sways instanced plants in the wind: bamboo, grass, reeds. Each instance's
 * geometry should run from 0 at its base to 1 at its tip, so the base stays put.
 * With `rigid`, the whole piece moves as one, for leaves sitting on a stalk top.
 */
export function applySway(material: THREE.Material, amplitude: number, rigid = false): void {
  chain(material, `sway-${amplitude}-${rigid}`, shader => {
    shader.uniforms.uWindTime = windTime;
    shader.uniforms.uSwayAmp = { value: amplitude };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uWindTime;
        uniform float uSwayAmp;`)
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        {
          float tip = ${rigid ? '1.0' : 'clamp(position.y, 0.0, 1.0)'};
          float bend = tip * tip;
          vec2 base = vec2(modelMatrix[3].x, modelMatrix[3].z) + mvPosition.xz;
          // A steady lean, gusts rolling through, and a quick flutter on top
          float gust = sin(uWindTime * 0.7 + base.x * 0.08 + base.y * 0.05) * 0.5 + 0.5;
          vec2 sway = vec2(
            sin(uWindTime * 1.6 + base.x * 0.45 + base.y * 0.21),
            cos(uWindTime * 1.3 + base.y * 0.37)) * (0.4 + gust * 0.8)
            + vec2(sin(uWindTime * 6.0 + base.x * 3.0), cos(uWindTime * 5.0 + base.y * 3.0)) * 0.12;
          mvPosition.xz += (sway + vec2(0.35, 0.15) * gust) * bend * uSwayAmp;
        }
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
  });
}

/**
 * Cloth pinned along its left edge (uv.x = 0) and top: banners and hangings.
 * Ripples travel out to the free edge and grow towards it.
 */
export function applyClothWave(material: THREE.Material, amplitude: number): void {
  chain(material, `cloth-${amplitude}`, shader => {
    shader.uniforms.uWindTime = windTime;
    shader.uniforms.uClothAmp = { value: amplitude };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uWindTime;
        uniform float uClothAmp;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float free = uv.x;
          float phase = modelMatrix[3].x * 0.7 + modelMatrix[3].z * 0.4;
          float wave = sin(uWindTime * 3.2 - uv.x * 7.0 + uv.y * 2.5 + phase) * 0.6
            + sin(uWindTime * 5.1 - uv.x * 13.0 + uv.y * 6.0 + phase) * 0.25;
          transformed.z += wave * free * uClothAmp;
          transformed.x -= abs(wave) * free * uClothAmp * 0.25;
        }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        {
          float slope = cos(uWindTime * 3.2 - uv.x * 7.0 + uv.y * 2.5 + modelMatrix[3].x * 0.7 + modelMatrix[3].z * 0.4);
          objectNormal = normalize(objectNormal + vec3(slope * uv.x * uClothAmp * 2.0, 0.0, 0.0));
        }`);
  });
}

/** Where the moon sits, for light shining through things. Matches SkyDome's MOON_DIRECTION. */
const MOON = new THREE.Vector3(0.42, 0.62, -0.66).normalize();

/**
 * Light through thin things: leaves, petals, paper. Looking towards the moon
 * through them, they glow with their own colour.
 */
export function applyTranslucency(material: THREE.Material, strength: number): void {
  chain(material, `translucent-${strength}`, shader => {
    shader.uniforms.uMoonWorld = { value: MOON };
    shader.uniforms.uTranslucency = { value: strength };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uMoonWorld;
        uniform float uTranslucency;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 toMoon = normalize((viewMatrix * vec4(uMoonWorld, 0.0)).xyz);
          vec3 lookDir = normalize(-vViewPosition);
          float through = pow(max(dot(lookDir, toMoon), 0.0), 3.0);
          // Edges of leaves catch more, as light scatters out through them
          float thin = 0.5 + 0.5 * (1.0 - abs(dot(normal, normalize(vViewPosition))));
          totalEmissiveRadiance += diffuseColor.rgb * (through * 1.4 + 0.08) * thin * uTranslucency;
        }`);
  });
}
