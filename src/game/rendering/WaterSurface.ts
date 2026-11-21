import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MOON_DIRECTION } from '../atmosphere/SkyDome';

const VERTEX = /* glsl */`
  uniform mat4 textureMatrix;
  varying vec4 vReflUv;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vReflUv = textureMatrix * vec4(position, 1.0);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */`
  uniform sampler2D tReflection;
  uniform float uUseReflection;
  uniform sampler2D tFoam;
  uniform vec4 uFoamRect;
  uniform float uTime;
  uniform float uRain;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSky;
  uniform vec3 uMoonDir;
  uniform vec3 uGlowPos;
  uniform float uGlow;
  varying vec4 vReflUv;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float waves(vec2 p) {
    return wNoise(p * 0.55 + uTime * vec2(0.07, 0.05)) * 0.55
      + wNoise(p * 1.6 - uTime * vec2(0.1, 0.06)) * 0.3
      + wNoise(p * 4.3 + uTime * vec2(0.18, -0.12)) * 0.15;
  }

  // Raindrops: rings spreading out from random points, two layers offset in time
  vec2 ripples(vec2 p) {
    vec2 sum = vec2(0.0);
    for (int layer = 0; layer < 2; layer++) {
      vec2 q = p / 1.05 + float(layer) * 0.37;
      vec2 cell = floor(q);
      vec2 local = fract(q) - 0.5;
      vec2 offset = vec2(wHash(cell), wHash(cell + 4.1)) - 0.5;
      float phase = fract(uTime * 0.85 + wHash(cell + 9.3) + float(layer) * 0.5);
      vec2 toCenter = local - offset * 0.5;
      float d = length(toCenter);
      float radius = phase * 0.42;
      float ring = sin((d - radius) * 55.0) * exp(-pow((d - radius) * 14.0, 2.0)) * (1.0 - phase);
      sum += normalize(toCenter + 0.0001) * ring;
    }
    return sum;
  }

  void main() {
    vec2 p = vWorld.xz;

    // The surface's slope, from the waves and any rain
    float e = 0.12;
    float h0 = waves(p);
    vec3 n = normalize(vec3(-(waves(p + vec2(e, 0.0)) - h0) / e * 0.4, 1.0, -(waves(p + vec2(0.0, e)) - h0) / e * 0.4));
    n.xz -= ripples(p) * 0.35 * uRain;
    n = normalize(n);

    vec3 V = normalize(cameraPosition - vWorld);
    float fresnel = 0.03 + 0.97 * pow(1.0 - max(dot(n, V), 0.0), 5.0);

    // What the water reflects: the world above it, or failing that, the sky
    vec3 reflected;
    if (uUseReflection > 0.5) {
      vec2 uv = vReflUv.xy / vReflUv.w + n.xz * 0.035;
      reflected = texture2D(tReflection, uv).rgb;
    } else {
      reflected = mix(uSky * 1.3, uSky * 0.55, clamp(V.y, 0.0, 1.0));
    }

    vec3 body = mix(uShallow, uDeep, 0.55 + (h0 - 0.5) * 0.4);
    vec3 color = mix(body, reflected, clamp(fresnel * 1.15 + 0.18, 0.0, 1.0));

    // The moon's glint
    vec3 R = reflect(-V, n);
    color += vec3(0.75, 0.85, 1.0) * pow(max(dot(R, uMoonDir), 0.0), 220.0) * 2.2;

    // Foam where the water meets posts, walls and the shore
    float foamEdge = texture2D(tFoam, (p - uFoamRect.xy) / uFoamRect.zw).r;
    float foamNoise = wNoise(p * 3.2 + uTime * vec2(0.3, 0.2)) * 0.6 + wNoise(p * 9.0 - uTime * 0.5) * 0.4;
    float foam = smoothstep(0.38, 0.72, foamEdge * (0.55 + foamNoise * 0.8));
    color = mix(color, vec3(0.62, 0.7, 0.74), foam * 0.75);

    // Where something vast sits in the water, it glows, and rings spread from it
    float d = length(p - uGlowPos.xz);
    float glow = exp(-d * d / 28.0) * uGlow;
    float ring = exp(-pow((d - 3.4 - sin(uTime * 1.8) * 0.3) * 2.2, 2.0)) * uGlow;
    float ring2 = exp(-pow((d - 6.0 - sin(uTime * 1.8 + 1.4) * 0.4) * 1.8, 2.0)) * uGlow * 0.5;
    color += vec3(0.18, 0.55, 0.85) * glow * 0.9;
    color = mix(color, vec3(0.7, 0.86, 0.95), (ring + ring2) * 0.45);

    float alpha = clamp(0.8 + fresnel * 0.18 + foam * 0.2, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
    #include <fog_fragment>
  }
`;

export interface WaterOptions {
  shallow: number;
  deep: number;
  sky: number;
  /** Rings from falling rain. */
  rain: boolean;
  /** True mirror reflections cost a second render of the scene: High quality only. */
  reflections: boolean;
  /** A mask, light where foam should gather, covering `foamRect` (minX, minZ, width, depth). */
  foam: THREE.Texture;
  foamRect: THREE.Vector4;
}

/**
 * WaterSurface — One sheet of water made of any number of rectangles at the
 * same height. Waves, the moon's glint, foam at its edges, rain rings, a glow
 * where Umibōzu sits, and on High, a true reflection of the world above.
 */
export class WaterSurface {
  public readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private reflector: Reflector | null = null;
  private glowTarget = 0;

  constructor(rects: { minX: number; maxX: number; minZ: number; maxZ: number }[], height: number, options: WaterOptions) {
    // Flat in x and y, then laid down, as the reflector expects
    const pieces = rects.map(r => {
      const g = new THREE.PlaneGeometry(r.maxX - r.minX, r.maxZ - r.minZ);
      g.translate((r.minX + r.maxX) / 2, -(r.minZ + r.maxZ) / 2, 0);
      return g;
    });
    const geometry = mergeGeometries(pieces) ?? pieces[0];

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        tReflection: { value: null },
        uUseReflection: { value: 0 },
        textureMatrix: { value: new THREE.Matrix4() },
        tFoam: { value: options.foam },
        uFoamRect: { value: options.foamRect },
        uTime: { value: 0 },
        uRain: { value: options.rain ? 1 : 0 },
        uShallow: { value: new THREE.Color(options.shallow) },
        uDeep: { value: new THREE.Color(options.deep) },
        uSky: { value: new THREE.Color(options.sky) },
        uMoonDir: { value: MOON_DIRECTION.clone() },
        uGlowPos: { value: new THREE.Vector3() },
        uGlow: { value: 0 },
      }]),
    });
    this.material.uniforms.tFoam.value = options.foam;
    this.material.uniforms.uFoamRect.value = options.foamRect;

    if (options.reflections) {
      const reflector = new Reflector(geometry, { textureWidth: 1024, textureHeight: 576, clipBias: 0.02 });
      const original = reflector.material as THREE.ShaderMaterial;
      // Share the reflector's projection, which it updates before each render
      this.material.uniforms.textureMatrix.value = original.uniforms.textureMatrix.value;
      this.material.uniforms.tReflection.value = reflector.getRenderTarget().texture;
      this.material.uniforms.uUseReflection.value = 1;
      original.dispose();
      reflector.material = this.material;
      this.reflector = reflector;
      this.mesh = reflector;
    } else {
      this.mesh = new THREE.Mesh(geometry, this.material);
    }
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = height;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.userData.noAO = true;
    this.mesh.userData.noShadow = true;
    this.mesh.userData.noSurface = true;
    this.mesh.receiveShadow = false;
  }

  /** A glow and spreading rings in the water around this point, or none. */
  public setGlow(position: THREE.Vector3 | null): void {
    this.glowTarget = position ? 1 : 0;
    if (position) this.material.uniforms.uGlowPos.value.copy(position);
  }

  public update(time: number, dt: number): void {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uGlow.value += (this.glowTarget - u.uGlow.value) * Math.min(1, dt * 1.5);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.reflector?.dispose();
    (this.material.uniforms.tFoam.value as THREE.Texture)?.dispose();
    this.mesh.removeFromParent();
  }
}
