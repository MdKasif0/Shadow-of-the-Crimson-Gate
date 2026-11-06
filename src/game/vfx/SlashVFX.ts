import * as THREE from 'three';

const ARC_HALF_ANGLE = 1.35;
const INNER_RADIUS = 0.55;
const OUTER_RADIUS = 2.4;
const POOL_SIZE = 4;

const SLASH_VERTEX = /* glsl */`
  varying vec2 vPolar;
  void main() {
    vPolar = vec2(atan(position.x, position.z), length(position.xz));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A sumi-e brush stroke: dry-brush streaks along the arc, black-crimson ink at
// the body, white-hot where the blade's edge passes.
const SLASH_FRAGMENT = /* glsl */`
  uniform float uProgress;
  uniform float uOpacity;
  uniform float uDirection;
  uniform float uArc;
  uniform vec3 uInk;
  uniform vec3 uEdge;
  varying vec2 vPolar;

  float hash(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
  float noise(float x) {
    float i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }

  void main() {
    float along = vPolar.x / uArc * uDirection;
    float across = (vPolar.y - ${INNER_RADIUS.toFixed(2)}) / ${(OUTER_RADIUS - INNER_RADIUS).toFixed(2)};

    // The stroke sweeps across the arc, leaving a tail behind its head
    float head = -1.15 + uProgress * 2.6;
    float tail = smoothstep(head - 2.2, head - 0.45, along);
    float front = 1.0 - smoothstep(head - 0.02, head + 0.06, along);

    // Long, broken bristle marks
    float bristles = noise(across * 34.0) * 0.7 + noise(across * 11.0 + 4.0) * 0.5;
    float dryBrush = smoothstep(0.22, 0.72, bristles + (along + 1.0) * 0.14);

    float edges = smoothstep(0.0, 0.3, across) * (1.0 - smoothstep(0.92, 1.0, across));
    float alpha = tail * front * edges * dryBrush * uOpacity;
    if (alpha < 0.01) discard;

    float hot = pow(across, 3.0) * smoothstep(head - 0.55, head, along);
    gl_FragColor = vec4(mix(uInk, uEdge, hot), alpha);
  }
`;

interface Slash {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  timer: number;
  duration: number;
}

/**
 * SlashVFX — Blood-ink brush strokes that follow each swing. The white-hot edge
 * is bright enough for bloom to catch.
 */
export class SlashVFX {
  private slashes: Slash[] = [];
  private nextIndex = 0;

  constructor(scene: THREE.Scene) {
    const arcGeometry = new THREE.RingGeometry(INNER_RADIUS, OUTER_RADIUS, 40, 6, Math.PI / 2 - ARC_HALF_ANGLE, ARC_HALF_ANGLE * 2);
    arcGeometry.rotateX(Math.PI / 2); // Lies flat with its middle facing +Z

    const fullCircle = new THREE.RingGeometry(INNER_RADIUS, OUTER_RADIUS, 64, 6);
    fullCircle.rotateX(Math.PI / 2);

    for (let i = 0; i < POOL_SIZE; i++) {
      const material = new THREE.ShaderMaterial({
        vertexShader: SLASH_VERTEX,
        fragmentShader: SLASH_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uProgress: { value: 0 },
          uOpacity: { value: 0 },
          uDirection: { value: 1 },
          uArc: { value: ARC_HALF_ANGLE },
          uInk: { value: new THREE.Color(0x18040a) },
          uEdge: { value: new THREE.Color(3, 3.2, 3.6) },
        },
      });
      const mesh = new THREE.Mesh(arcGeometry, material);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.rotation.order = 'YXZ';
      mesh.userData.arcGeometry = arcGeometry;
      mesh.userData.fullGeometry = fullCircle;
      scene.add(mesh);
      this.slashes.push({ mesh, material, timer: 0, duration: 1 });
    }
  }

  public spawn(position: THREE.Vector3, direction: THREE.Vector3, type: number): void {
    const slash = this.slashes[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % POOL_SIZE;

    const isFinisher = type === 4;
    slash.mesh.geometry = isFinisher ? slash.mesh.userData.fullGeometry : slash.mesh.userData.arcGeometry;
    slash.duration = isFinisher ? 0.5 : (type === 3 ? 0.3 : 0.24);
    slash.timer = slash.duration;
    slash.mesh.visible = true;

    slash.mesh.position.copy(position).addScaledVector(direction, 0.1);
    slash.mesh.position.y = 1.15;

    // The first two swings cut on opposite diagonals. Heavier cuts sweep wide, leaning
    // back a little so the stroke still reads from a low camera. The finisher stays level.
    const tilt = type === 1 ? 0.5 : type === 2 ? -0.5 : 0;
    const lean = type === 3 ? -0.34 : 0;
    slash.mesh.rotation.set(lean, Math.atan2(direction.x, direction.z), tilt);
    slash.mesh.scale.setScalar(isFinisher ? 2.5 : type === 3 ? 1.35 : 1);

    const uniforms = slash.material.uniforms;
    uniforms.uDirection.value = type === 2 ? -1 : 1;
    uniforms.uArc.value = isFinisher ? Math.PI : ARC_HALF_ANGLE;
    uniforms.uEdge.value.setRGB(...(type >= 3 ? [3.6, 1.3, 0.9] as const : [3, 3.2, 3.6] as const));
    uniforms.uInk.value.setHex(type >= 3 ? 0x3a0408 : 0x18040a);
    uniforms.uProgress.value = 0;
    uniforms.uOpacity.value = 1;
  }

  public update(dt: number): void {
    for (const slash of this.slashes) {
      if (slash.timer <= 0) continue;

      slash.timer -= dt;
      if (slash.timer <= 0) {
        slash.mesh.visible = false;
        continue;
      }

      const t = 1 - slash.timer / slash.duration;
      slash.material.uniforms.uProgress.value = Math.min(1, t * 1.7);
      slash.material.uniforms.uOpacity.value = 1 - Math.max(0, t - 0.55) / 0.45;
    }
  }
}
