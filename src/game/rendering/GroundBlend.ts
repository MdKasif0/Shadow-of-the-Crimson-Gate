import * as THREE from 'three';
import { SurfaceUniforms } from './Surfaces';

/**
 * GroundBlend — Ground that mixes four materials by where you stand: mud
 * underneath, moss over it in the damp places, stone breaking through, and ash
 * where things have burned. When it rains, puddles gather in the low spots.
 */
export interface GroundPalette {
  mud: number;
  moss: number;
  stone: number;
  ash: number;
  /** How much of each layer, from 0 to 1. */
  amount: { moss: number; stone: number; ash: number };
}

const FRAGMENT_PARS = /* glsl */`
  uniform vec3 uMud;
  uniform vec3 uMoss;
  uniform vec3 uStone;
  uniform vec3 uAsh;
  uniform vec3 uAmount;
  uniform float uWetness;
  varying vec3 vGroundWorld;

  float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float gFbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += gNoise(p) * a; p = p * 2.07 + 13.1; a *= 0.5; }
    return s / 0.9375;
  }
  vec3 groundNormal(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
    vec3 sigmaX = normalize(dFdx(surfPos));
    vec3 sigmaY = normalize(dFdy(surfPos));
    vec3 r1 = cross(sigmaY, surfNorm);
    vec3 r2 = cross(surfNorm, sigmaX);
    float det = dot(sigmaX, r1) * faceDir;
    vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
    return normalize(abs(det) * surfNorm - grad);
  }
`;

const FRAGMENT_COLOR = /* glsl */`
  vec2 gp = vGroundWorld.xz;
  float gLarge = gFbm(gp * 0.045);
  float gMid = gFbm(gp * 0.16 + 5.0);
  float gFine = gFbm(gp * 1.7 + 11.0);
  float gGrit = gNoise(gp * 9.0);
  float mossMask = smoothstep(0.42, 0.62, gLarge + (gMid - 0.5) * 0.4) * uAmount.x;
  float stoneMask = smoothstep(0.6, 0.72, gMid + (gFine - 0.5) * 0.25) * uAmount.y;
  float ashMask = smoothstep(0.45, 0.65, gFbm(gp * 0.09 + 31.0) + (gFine - 0.5) * 0.3) * uAmount.z;
  vec3 gColor = uMud * (0.8 + gFine * 0.4);
  gColor = mix(gColor, uMoss * (0.75 + gFine * 0.5), mossMask);
  gColor = mix(gColor, uStone * (0.7 + gGrit * 0.5), stoneMask);
  gColor = mix(gColor, uAsh * (0.8 + gGrit * 0.35), ashMask);
  // Low spots hold water when it rains
  float puddle = smoothstep(0.38, 0.3, gLarge + (gFine - 0.5) * 0.12) * uWetness;
  gColor *= 1.0 - uWetness * 0.3 - puddle * 0.35;
  diffuseColor.rgb *= gColor;
  float gHeight = gFine * 0.6 + gGrit * 0.4 + stoneMask * 0.5;
`;

const FRAGMENT_ROUGHNESS = /* glsl */`
  roughnessFactor = mix(0.92, 0.75, mossMask * 0.3);
  roughnessFactor = mix(roughnessFactor, 0.8, stoneMask);
  roughnessFactor = mix(roughnessFactor, 1.0, ashMask);
  roughnessFactor = mix(roughnessFactor, 0.35, uWetness * 0.6);
  roughnessFactor = mix(roughnessFactor, 0.08, puddle);
`;

const FRAGMENT_NORMAL = /* glsl */`
  {
    vec2 gDH = vec2(dFdx(gHeight), dFdy(gHeight)) * (1.2 - puddle);
    normal = groundNormal(-vViewPosition, normal, gDH, faceDirection);
  }
`;

/** A material for the ground of a level, blended from its palette. */
export function createGroundMaterial(palette: GroundPalette): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uMud = { value: new THREE.Color(palette.mud) };
    shader.uniforms.uMoss = { value: new THREE.Color(palette.moss) };
    shader.uniforms.uStone = { value: new THREE.Color(palette.stone) };
    shader.uniforms.uAsh = { value: new THREE.Color(palette.ash) };
    shader.uniforms.uAmount = { value: new THREE.Vector3(palette.amount.moss, palette.amount.stone, palette.amount.ash) };
    shader.uniforms.uWetness = SurfaceUniforms.uWetness;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGroundWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAGMENT_COLOR}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${FRAGMENT_ROUGHNESS}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`);
  };
  material.customProgramCacheKey = () => 'ground-blend';
  return material;
}
