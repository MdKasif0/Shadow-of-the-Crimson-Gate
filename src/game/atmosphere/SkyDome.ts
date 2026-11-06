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
  varying vec3 vDirection;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float clouds(vec2 p) {
    return noise(p) * 0.55 + noise(p * 2.1 + 3.1) * 0.3 + noise(p * 4.3 + 7.7) * 0.15;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float up = max(dir.y, 0.0);
    vec3 color = mix(uHorizon, uZenith, pow(up, 0.55));

    // Stars
    vec2 starCell = floor(dir.xz / max(dir.y, 0.15) * 90.0);
    float star = step(0.9975, hash(starCell)) * smoothstep(0.08, 0.4, dir.y);
    color += vec3(0.75, 0.85, 1.0) * star * (0.5 + 0.5 * sin(uTime * 2.0 + hash(starCell) * 40.0));

    // Moon and halo
    float moonAngle = dot(dir, uMoonDir);
    color += vec3(0.5, 0.62, 0.85) * pow(max(moonAngle, 0.0), 90.0) * 0.55;
    color += vec3(3.4, 3.7, 4.2) * smoothstep(0.9988, 0.9992, moonAngle);

    // Drifting cloud bands that catch the moonlight
    vec2 cloudUv = dir.xz / (dir.y + 0.25) * 1.4 + vec2(uTime * 0.006, uTime * 0.002);
    float density = smoothstep(0.42, 0.78, clouds(cloudUv)) * smoothstep(0.0, 0.2, dir.y);
    vec3 cloudColor = mix(uHorizon * 0.8, vec3(0.3, 0.36, 0.48), pow(max(moonAngle, 0.0), 8.0));
    color = mix(color, cloudColor, density * 0.8);

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

  public update(dt: number, fogColor: THREE.Color): void {
    this.material.uniforms.uTime.value += dt;
    this.material.uniforms.uHorizon.value.copy(fogColor);
    this.material.uniforms.uZenith.value.copy(fogColor).multiplyScalar(0.18).add(new THREE.Color(0x03060d));
  }
}
