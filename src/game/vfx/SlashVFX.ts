import * as THREE from 'three';

/**
 * SlashVFX — Procedural sword slash ribbon effect.
 */
export class SlashVFX {
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private active: boolean = false;
  private timer: number = 0;
  private duration: number = 0.15;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(3, 3);
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public spawn(position: THREE.Vector3, direction: THREE.Vector3, type: number): void {
    this.active = true;
    this.timer = this.duration;
    this.mesh.visible = true;
    this.material.opacity = 1.0;

    this.mesh.position.copy(position).addScaledVector(direction, 1.5);
    this.mesh.position.y = 1.0;
    this.mesh.rotation.set(Math.PI / 2, 0, Math.atan2(direction.x, direction.z));

    if (type === 3) {
      this.mesh.scale.set(1.5, 1.5, 1.5);
      this.material.color.setHex(0xffffff);
    } else {
      this.mesh.scale.set(1, 1, 1);
      this.material.color.setHex(0xaaaaaa);
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
