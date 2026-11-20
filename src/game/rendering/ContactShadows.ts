import * as THREE from 'three';

/** A soft dark disc, darkest in the middle: the shadow right under someone's feet. */
function blobTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.5)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export interface ShadowCaster {
  position: THREE.Vector3;
  radius: number;
  /** Fades the shadow, for something that's dying or hidden. */
  strength: number;
}

/**
 * ContactShadows — Soft darkening right under each character, where the
 * moonlight's shadow map is too coarse to reach. It keeps people from looking
 * like they float, at every quality level, for almost nothing.
 */
export class ContactShadows {
  private pool: THREE.Mesh[] = [];
  private geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private material: THREE.MeshBasicMaterial;

  constructor(private scene: THREE.Scene) {
    this.material = new THREE.MeshBasicMaterial({
      map: blobTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
  }

  public update(casters: ShadowCaster[], groundHeight: (x: number, z: number) => number): void {
    while (this.pool.length < casters.length) {
      const mesh = new THREE.Mesh(this.geometry, this.material.clone());
      mesh.renderOrder = 1;
      mesh.userData.noAO = true;
      this.scene.add(mesh);
      this.pool.push(mesh);
    }
    this.pool.forEach((mesh, i) => {
      const caster = casters[i];
      mesh.visible = !!caster && caster.strength > 0.02;
      if (!mesh.visible) return;
      const ground = groundHeight(caster.position.x, caster.position.z);
      // Fainter as its owner rises off the ground
      const lift = Math.max(0, caster.position.y - ground);
      const fade = Math.max(0, 1 - lift / 2.5);
      mesh.position.set(caster.position.x, ground + 0.04, caster.position.z);
      mesh.scale.setScalar(caster.radius * 2.6 * (1 + lift * 0.3));
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * caster.strength * fade;
    });
  }
}
