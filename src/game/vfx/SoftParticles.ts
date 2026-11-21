import * as THREE from 'three';
import { SettingsManager } from '../settings/SettingsManager';

/**
 * SoftParticles — Round, soft-edged points that grow and fade as they live:
 * smoke, spirit-fire, dust, drips. One draw call for the whole pool, sized in
 * world units so they shrink with distance like anything else.
 */

const VERTEX = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uViewHalfHeight;
  varying float vAlpha;
  varying vec3 vColor;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * projectionMatrix[1][1] * uViewHalfHeight / max(-mvPosition.z, 0.1);
    vAlpha = aAlpha;
    vColor = aColor;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */`
  uniform float uSoftness;
  uniform float uNoisy;
  varying float vAlpha;
  varying vec3 vColor;
  #include <fog_pars_fragment>
  float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float a = pow(clamp(1.0 - d, 0.0, 1.0), uSoftness);
    // Smoke breaks up at its edges rather than ending in a clean circle
    if (uNoisy > 0.5) {
      vec2 q = gl_PointCoord * 4.0;
      vec2 i = floor(q), f = fract(q);
      f = f * f * (3.0 - 2.0 * f);
      float n = mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), f.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), f.x), f.y);
      a *= smoothstep(0.15, 0.75, n + (1.0 - d) * 0.5);
    }
    a *= vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
    #include <fog_fragment>
  }
`;

export interface ParticleSpawn {
  position: THREE.Vector3;
  velocity?: THREE.Vector3;
  life: number;
  size: number;
  /** Size at the end of its life; defaults to `size`. */
  sizeEnd?: number;
  color: THREE.Color | number;
  alpha?: number;
  /** Upward pull is negative. */
  gravity?: number;
  /** Fraction of speed lost per second. */
  drag?: number;
}

interface Particle {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  sizeEnd: number;
  color: THREE.Color;
  alpha: number;
  gravity: number;
  drag: number;
}

export interface SoftParticleOptions {
  blending?: 'additive' | 'normal';
  /** Higher is a tighter, harder-edged dot. */
  softness?: number;
  /** Breaks the edge up, for smoke. */
  noisy?: boolean;
  fog?: boolean;
}

const DENSITY = { LOW: 0.35, MEDIUM: 0.7, HIGH: 1 } as const;

export class SoftParticles {
  public readonly points: THREE.Points;
  private particles: Particle[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private next = 0;

  constructor(private readonly max: number, options: SoftParticleOptions = {}) {
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0, 0);

    const fog = options.fog ?? true;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      fog,
      blending: options.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uViewHalfHeight: { value: 360 },
        uSoftness: { value: options.softness ?? 1.6 },
        uNoisy: { value: options.noisy ? 1 : 0 },
      }]),
    });

    for (let i = 0; i < max; i++) {
      this.particles.push({
        active: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0, maxLife: 1,
        size: 1, sizeEnd: 1, color: new THREE.Color(), alpha: 1, gravity: 0, drag: 0,
      });
    }

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    this.points.userData.noAO = true;
    this.points.userData.noShadow = true;
    const size = new THREE.Vector2();
    this.points.onBeforeRender = renderer => {
      renderer.getDrawingBufferSize(size);
      this.material.uniforms.uViewHalfHeight.value = size.y / 2;
    };
  }

  /** Fewer particles on lower effect settings. */
  public static density(): number {
    return DENSITY[SettingsManager.getInstance().get().vfxIntensity] ?? 1;
  }

  public emit(spawn: ParticleSpawn): void {
    const p = this.particles[this.next];
    this.next = (this.next + 1) % this.max;
    p.active = true;
    p.position.copy(spawn.position);
    if (spawn.velocity) p.velocity.copy(spawn.velocity);
    else p.velocity.set(0, 0, 0);
    p.life = spawn.life;
    p.maxLife = spawn.life;
    p.size = spawn.size;
    p.sizeEnd = spawn.sizeEnd ?? spawn.size;
    if (typeof spawn.color === 'number') p.color.setHex(spawn.color);
    else p.color.copy(spawn.color);
    p.alpha = spawn.alpha ?? 1;
    p.gravity = spawn.gravity ?? 0;
    p.drag = spawn.drag ?? 0;
  }

  public update(dt: number): void {
    let count = 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.velocity.y -= p.gravity * dt;
      if (p.drag > 0) p.velocity.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.position.addScaledVector(p.velocity, dt);

      const t = 1 - p.life / p.maxLife;
      const fade = Math.min(1, t / 0.12) * (1 - t * t);
      const i3 = count * 3;
      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;
      this.colors[i3] = p.color.r;
      this.colors[i3 + 1] = p.color.g;
      this.colors[i3 + 2] = p.color.b;
      this.sizes[count] = p.size + (p.sizeEnd - p.size) * t;
      this.alphas[count] = p.alpha * fade;
      count++;
    }
    this.geometry.setDrawRange(0, count);
    for (const name of ['position', 'aColor', 'aSize', 'aAlpha']) {
      const attribute = this.geometry.getAttribute(name) as THREE.BufferAttribute;
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, count * attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  public clear(): void {
    for (const p of this.particles) p.active = false;
    this.geometry.setDrawRange(0, 0);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.points.removeFromParent();
  }
}
