import * as THREE from 'three';
import { MOON_DIRECTION } from '../atmosphere/SkyDome';

const SHAFT_VERTEX = /* glsl */`
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SHAFT_FRAGMENT = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    // Soft at both sides, fading out towards the ground and up into the canopy
    float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float sides = smoothstep(0.0, 0.7, across);
    float along = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
    // Dust drifting through the beam
    float dust = 0.75 + 0.25 * sin(vUv.y * 9.0 + uTime * 0.6 + uSeed) * sin(vUv.x * 5.0 - uTime * 0.4 + uSeed * 2.0);
    // Hidden right up close, where a flat quad would give itself away
    float near = smoothstep(2.0, 8.0, vDepth);
    float alpha = sides * along * dust * near * uOpacity;
    gl_FragColor = vec4(uColor * alpha, alpha);
  }
`;

interface Shaft {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

export interface ShaftOptions {
  color: number;
  opacity: number;
  /** Shaft width range, and length along the light. */
  width: [number, number];
  length: number;
  /** Direction the light travels. Defaults to straight down from the moon. */
  direction?: THREE.Vector3;
}

/**
 * LightShafts — Beams of light falling through gaps: moonlight through the
 * bamboo, firelight through smoke. Each is a soft quad turned around its own
 * axis to face the camera, so it reads as a volume from any side.
 */
export class LightShafts {
  public readonly group = new THREE.Group();
  private shafts: Shaft[] = [];
  private direction: THREE.Vector3;
  private geometry = new THREE.PlaneGeometry(1, 1);
  private axis = new THREE.Vector3();
  private toCamera = new THREE.Vector3();
  private side = new THREE.Vector3();
  private facing = new THREE.Vector3();
  private basis = new THREE.Matrix4();

  constructor(private options: ShaftOptions) {
    this.group.name = 'LightShafts';
    this.direction = (options.direction ?? MOON_DIRECTION.clone().negate()).clone().normalize();
    this.geometry.translate(0, 0.5, 0);
  }

  /** A shaft whose lower end lands at `ground`. */
  public add(ground: THREE.Vector3, random: () => number = Math.random): void {
    const { color, opacity, width, length } = this.options;
    const material = new THREE.ShaderMaterial({
      vertexShader: SHAFT_VERTEX,
      fragmentShader: SHAFT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity * (0.6 + random() * 0.4) },
        uTime: { value: 0 },
        uSeed: { value: random() * 10 },
      },
    });
    const mesh = new THREE.Mesh(this.geometry, material);
    // The quad runs from the ground back up the beam towards its source
    mesh.position.copy(ground);
    mesh.scale.set(width[0] + random() * (width[1] - width[0]), length, 1);
    mesh.userData.noAO = true;
    mesh.userData.noShadow = true;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.shafts.push({ mesh, material });
  }

  public update(time: number, camera: THREE.Camera): void {
    this.axis.copy(this.direction).negate();
    for (const { mesh, material } of this.shafts) {
      material.uniforms.uTime.value = time;
      // Turn around the beam's own axis to face the camera
      this.toCamera.copy(camera.position).sub(mesh.position);
      this.side.crossVectors(this.axis, this.toCamera).normalize();
      this.facing.crossVectors(this.side, this.axis).normalize();
      this.basis.makeBasis(this.side, this.axis, this.facing);
      mesh.quaternion.setFromRotationMatrix(this.basis);
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    for (const { material } of this.shafts) material.dispose();
    this.group.removeFromParent();
  }
}

/** A large, faint glow around a lamp, as if the air itself were lit. */
export function createHaloSprite(color: number, size: number, texture: THREE.Texture): THREE.Sprite {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    color,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true,
  }));
  sprite.scale.setScalar(size);
  sprite.userData.noAO = true;
  return sprite;
}
