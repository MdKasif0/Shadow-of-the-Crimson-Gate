import * as THREE from 'three';

/** Direction of the moon. The main shadow-casting light shines from here. */
export const MOON_DIRECTION = new THREE.Vector3(0.42, 0.62, -0.66).normalize();

const SKY_VERTEX = /* glsl */`
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */`
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uMoonDir;
  uniform float uTime;
  uniform float uCloudiness;
  varying vec3 vDirection;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float sum = 0.0, amp = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += noise(p) * amp;
      p = p * 2.03 + vec2(1.7, 9.2);
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float up = max(dir.y, 0.0);
    float moonAngle = dot(dir, uMoonDir);

    // Sky: a bright band at the horizon, deepening overhead
    vec3 color = mix(uHorizon, uZenith, pow(up, 0.45));
    color += uHorizon * 0.35 * exp(-up * 9.0);

    // Stars, thicker along a faint river of light across the sky
    vec2 starUv = dir.xz / max(dir.y + 0.12, 0.12);
    float band = exp(-pow(dot(dir, normalize(vec3(0.8, 0.2, 0.55))), 2.0) * 14.0);
    // Each star is a point somewhere in its cell, not the whole cell
    vec2 grid = starUv * 70.0;
    vec2 cell = floor(grid);
    vec2 spot = vec2(hash(cell + 1.3), hash(cell + 8.7)) * 0.7 + 0.15;
    float point = 1.0 - smoothstep(0.0, 0.09, length(fract(grid) - spot));
    float starChance = mix(0.985, 0.955, band);
    float star = step(starChance, hash(cell)) * point * smoothstep(0.05, 0.35, dir.y);
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.5 + hash(cell + 3.0) * 3.0) + hash(cell) * 40.0);
    color += vec3(0.78, 0.86, 1.0) * star * twinkle * (0.5 + hash(cell + 7.0) * 0.9);
    color += vec3(0.32, 0.34, 0.45) * band * fbm(starUv * 3.0) * 0.12 * smoothstep(0.05, 0.4, dir.y);

    // The moon: a wide soft halo, a ring of corona, then the disc with its seas
    float moonGlow = pow(max(moonAngle, 0.0), 24.0) * 0.35 + pow(max(moonAngle, 0.0), 300.0) * 0.9;
    vec3 halo = vec3(0.55, 0.66, 0.9) * moonGlow;
    float disc = smoothstep(0.99935, 0.99945, moonAngle);
    vec3 tangent = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
    vec3 bitangent = cross(tangent, uMoonDir);
    vec2 moonUv = vec2(dot(dir, tangent), dot(dir, bitangent)) * 900.0;
    float seas = fbm(moonUv * 0.18 + 4.0);
    float limb = sqrt(max(0.0, 1.0 - dot(moonUv, moonUv) / 1300.0));
    // Bright enough to bloom a little, but not so bright the seas wash out
    vec3 moon = vec3(1.45, 1.52, 1.62) * mix(0.55, 1.0, smoothstep(0.35, 0.65, seas)) * (0.6 + 0.4 * limb);

    // Two layers of cloud: high thin streaks, and a lower, heavier drift
    vec2 highUv = dir.xz / (dir.y + 0.18) * vec2(0.5, 1.6) + vec2(uTime * 0.004, 0.0);
    float high = smoothstep(0.55, 0.85, fbm(highUv * 1.3)) * 0.45;
    vec2 lowUv = dir.xz / (dir.y + 0.22) * 1.25 + vec2(uTime * 0.009, uTime * 0.003);
    float shape = fbm(lowUv);
    float cover = mix(0.72, 0.38, uCloudiness);
    float low = smoothstep(cover, cover + 0.22, shape);
    float horizonFade = smoothstep(-0.02, 0.18, dir.y);
    high *= horizonFade;
    low *= horizonFade;

    // Cloud edges facing the moon catch its light
    float lit = pow(max(moonAngle, 0.0), 6.0);
    float rim = smoothstep(cover - 0.04, cover + 0.06, shape) - smoothstep(cover + 0.06, cover + 0.2, shape);
    vec3 cloudBase = mix(uZenith * 1.6 + uHorizon * 0.25, uHorizon * 0.9, 1.0 - up);
    vec3 cloudColor = cloudBase + vec3(0.55, 0.62, 0.78) * (lit * 0.5 + rim * lit * 1.4);

    // Moon behind the clouds: dimmed, but shining through the thin parts
    color += halo * (1.0 - low * 0.65);
    color = mix(color, moon, disc * (1.0 - low * 0.85) * (1.0 - high * 0.4));
    color = mix(color, cloudColor * 1.15, high * 0.6);
    color = mix(color, cloudColor, low * 0.92);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Moonlit night sky whose horizon always matches the fog, so distant land melts into it. */
export class SkyDome {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uHorizon: { value: new THREE.Color(0x1c2a44) },
        uZenith: { value: new THREE.Color(0x05080f) },
        uMoonDir: { value: MOON_DIRECTION },
        uTime: { value: 0 },
        uCloudiness: { value: 0.5 },
      },
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    this.mesh.userData.noAO = true;
    this.mesh.onBeforeRender = (_renderer, _scene, camera) => {
      this.mesh.position.copy(camera.position);
      this.mesh.updateMatrixWorld();
    };
    scene.add(this.mesh);
  }

  /** 0 for a clear sky, 1 for overcast. Eases towards it. */
  public cloudiness = 0.5;

  public update(dt: number, fogColor: THREE.Color): void {
    const u = this.material.uniforms.uCloudiness;
    u.value += (this.cloudiness - u.value) * Math.min(1, dt * 0.8);
    this.material.uniforms.uTime.value += dt;
    this.material.uniforms.uHorizon.value.copy(fogColor);
    this.material.uniforms.uZenith.value.copy(fogColor).multiplyScalar(0.18).add(new THREE.Color(0x03060d));
  }
}
