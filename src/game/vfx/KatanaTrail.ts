import * as THREE from 'three';

const MAX_SAMPLES = 24;
const SUBDIVISIONS = 4;
const MAX_POINTS = (MAX_SAMPLES - 1) * SUBDIVISIONS + 1;

const VERTEX = /* glsl */`
  attribute float aAge;
  attribute float aSide;
  varying float vAge;
  varying float vSide;
  void main() {
    vAge = aAge;
    vSide = aSide;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// White-hot at the cutting edge, through steel-blue to a crimson smear at the
// back, all of it gone within a tenth of a second
const FRAGMENT = /* glsl */`
  uniform vec3 uEdge;
  uniform vec3 uBody;
  uniform vec3 uTail;
  uniform float uStrength;
  varying float vAge;
  varying float vSide;
  void main() {
    float fresh = 1.0 - clamp(vAge, 0.0, 1.0);
    float edge = smoothstep(0.78, 1.0, vSide);
    vec3 color = mix(uTail, uBody, smoothstep(0.0, 0.6, fresh));
    color = mix(color, uEdge, edge * fresh);
    float alpha = pow(fresh, 1.6) * (0.06 + pow(vSide, 3.0) * 0.94) * smoothstep(0.0, 0.2, vSide) * uStrength;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

interface Sample {
  base: THREE.Vector3;
  tip: THREE.Vector3;
  time: number;
}

/**
 * KatanaTrail — A ribbon of light following the blade through each cut,
 * drawn between the guard and the tip and smoothed between frames so fast
 * swings stay round even at a low frame rate.
 */
export class KatanaTrail {
  private mesh: THREE.Mesh;
  private geometry = new THREE.BufferGeometry();
  private material: THREE.ShaderMaterial;
  private positions = new Float32Array(MAX_POINTS * 2 * 3);
  private ages = new Float32Array(MAX_POINTS * 2);
  private samples: Sample[] = [];
  private time = 0;
  private lifetime = 0.11;

  constructor(scene: THREE.Scene) {
    const sides = new Float32Array(MAX_POINTS * 2);
    for (let i = 0; i < MAX_POINTS; i++) {
      sides[i * 2] = 0;
      sides[i * 2 + 1] = 1;
    }
    const index: number[] = [];
    for (let i = 0; i < MAX_POINTS - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aAge', new THREE.BufferAttribute(this.ages, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
    this.geometry.setIndex(index);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: {
        uEdge: { value: new THREE.Color(3.2, 3.1, 3.4) },
        uBody: { value: new THREE.Color(0.45, 0.7, 1.6) },
        uTail: { value: new THREE.Color(0.9, 0.08, 0.12) },
        uStrength: { value: 1 },
      },
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.mesh.userData.noAO = true;
    scene.add(this.mesh);
  }

  /**
   * Records where the blade is this frame. `isCutting` while a swing is under
   * way; `heavy` for the big cuts, which leave a longer, redder trail.
   */
  public update(dt: number, base: THREE.Vector3, tip: THREE.Vector3, isCutting: boolean, heavy: boolean): void {
    this.time += dt;
    this.lifetime = heavy ? 0.16 : 0.11;
    this.material.uniforms.uTail.value.setRGB(heavy ? 1.2 : 0.9, heavy ? 0.06 : 0.08, heavy ? 0.05 : 0.12);
    if (isCutting) {
      const last = this.samples[this.samples.length - 1];
      if (!last || last.tip.distanceToSquared(tip) > 0.0004) {
        this.samples.push({ base: base.clone(), tip: tip.clone(), time: this.time });
        if (this.samples.length > MAX_SAMPLES) this.samples.shift();
      }
    }
    while (this.samples.length > 0 && this.time - this.samples[0].time > this.lifetime) this.samples.shift();
    this.rebuild();
  }

  public clear(): void {
    this.samples = [];
    this.geometry.setDrawRange(0, 0);
  }

  private rebuild(): void {
    const s = this.samples;
    if (s.length < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }
    const base = new THREE.Vector3();
    const tip = new THREE.Vector3();
    let count = 0;
    const write = (b: THREE.Vector3, t: THREE.Vector3, age: number) => {
      this.positions.set([b.x, b.y, b.z], count * 6);
      this.positions.set([t.x, t.y, t.z], count * 6 + 3);
      this.ages[count * 2] = age;
      this.ages[count * 2 + 1] = age;
      count++;
    };
    // Catmull-Rom between samples, so a cut that crossed a big arc in one frame still curves
    for (let i = 0; i < s.length - 1; i++) {
      const p0 = s[Math.max(0, i - 1)];
      const p1 = s[i];
      const p2 = s[i + 1];
      const p3 = s[Math.min(s.length - 1, i + 2)];
      for (let k = 0; k < SUBDIVISIONS; k++) {
        const t = k / SUBDIVISIONS;
        catmull(p0.base, p1.base, p2.base, p3.base, t, base);
        catmull(p0.tip, p1.tip, p2.tip, p3.tip, t, tip);
        const time = p1.time + (p2.time - p1.time) * t;
        write(base, tip, (this.time - time) / this.lifetime);
      }
    }
    const last = s[s.length - 1];
    write(last.base, last.tip, (this.time - last.time) / this.lifetime);

    this.geometry.setDrawRange(0, (count - 1) * 6);
    const position = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const age = this.geometry.getAttribute('aAge') as THREE.BufferAttribute;
    position.clearUpdateRanges();
    position.addUpdateRange(0, count * 6);
    position.needsUpdate = true;
    age.clearUpdateRanges();
    age.addUpdateRange(0, count * 2);
    age.needsUpdate = true;
  }
}

function catmull(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;
  out.x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  out.y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  out.z = 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
  return out;
}
