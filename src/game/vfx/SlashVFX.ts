import * as THREE from 'three';

const ARC_HALF_ANGLE = 1.25;
const INNER_RADIUS = 0.75;
const OUTER_RADIUS = 2.3;

/**
 * SlashVFX — A glowing crescent that follows the swing, brightest at the blade's
 * tip. Bright enough for bloom to catch it.
 */
export class SlashVFX {
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private active: boolean = false;
  private timer: number = 0;
  private duration: number = 0.17;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.RingGeometry(INNER_RADIUS, OUTER_RADIUS, 28, 4, Math.PI / 2 - ARC_HALF_ANGLE, ARC_HALF_ANGLE * 2);
    geo.rotateX(Math.PI / 2); // Lies flat with its middle facing +Z

    // Fade from clear at the inner edge and arc ends to full brightness at the outer rim
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const radial = (Math.hypot(x, z) - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS);
      const along = 1 - Math.abs(Math.atan2(x, z)) / ARC_HALF_ANGLE;
      const value = Math.pow(radial, 2.4) * Math.min(1, along * 3);
      colors.set([value, value, value], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.visible = false;
    this.mesh.rotation.order = 'YXZ';
    scene.add(this.mesh);
  }

  public spawn(position: THREE.Vector3, direction: THREE.Vector3, type: number): void {
    this.active = true;
    this.timer = this.duration;
    this.mesh.visible = true;
    this.material.opacity = 1.0;

    this.mesh.position.copy(position).addScaledVector(direction, 0.1);
    this.mesh.position.y = 1.15;

    // The first two swings cut on opposite diagonals; the finisher is a wide flat sweep
    const tilt = type === 1 ? 0.5 : type === 2 ? -0.5 : 0;
    this.mesh.rotation.set(0, Math.atan2(direction.x, direction.z), tilt);

    if (type === 3) {
      this.mesh.scale.setScalar(1.4);
      this.material.color.setRGB(2.4, 1.1, 1.0); // Crimson-hot finisher
    } else {
      this.mesh.scale.setScalar(1);
      this.material.color.setRGB(2.0, 2.2, 2.6);
    }
  }

  public update(dt: number): void {
    if (!this.active) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.active = false;
      this.mesh.visible = false;
    } else {
      this.material.opacity = this.timer / this.duration;
    }
  }
}
