import * as THREE from 'three';
import { getGlowTexture } from '../utils/ProceduralTextures';

const PUFF_COUNT = 26;
const AREA = 56;

/** Slow-drifting soft puffs low to the ground that travel with the player. */
export class GroundMist {
  private puffs: { sprite: THREE.Sprite; drift: number }[] = [];
  private material: THREE.SpriteMaterial;

  constructor(scene: THREE.Scene) {
    this.material = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: 0x8ea3c0,
      opacity: 0.07,
      depthWrite: false,
      fog: true,
    });

    for (let i = 0; i < PUFF_COUNT; i++) {
      const sprite = new THREE.Sprite(this.material);
      sprite.position.set((Math.random() - 0.5) * AREA, 0.7 + Math.random() * 1.1, (Math.random() - 0.5) * AREA);
      sprite.scale.set(12 + Math.random() * 14, 3 + Math.random() * 3, 1);
      scene.add(sprite);
      this.puffs.push({ sprite, drift: 0.2 + Math.random() * 0.4 });
    }
  }

  public update(dt: number, center: THREE.Vector3, tint: THREE.Color): void {
    this.material.color.copy(tint).multiplyScalar(2.2).add(new THREE.Color(0x202530));

    const half = AREA / 2;
    for (const { sprite, drift } of this.puffs) {
      sprite.position.x += drift * dt;
      // Wrap around the player so the mist never runs out
      if (sprite.position.x - center.x > half) sprite.position.x -= AREA;
      if (sprite.position.x - center.x < -half) sprite.position.x += AREA;
      if (sprite.position.z - center.z > half) sprite.position.z -= AREA;
      if (sprite.position.z - center.z < -half) sprite.position.z += AREA;
    }
  }
}
