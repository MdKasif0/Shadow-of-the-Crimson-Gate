import * as THREE from 'three';
import { createGlowSprite } from '../lighting/WorldLights';

const PICKUP_RADIUS = 2.2;

/**
 * EssenceDrop — Unspent essence left where the Ronin fell. Walking back to it
 * recovers it; dying again first loses it for good.
 */
export class EssenceDrop {
  public readonly root = new THREE.Group();
  private glow: THREE.Sprite;
  private core: THREE.Mesh;
  private time = 0;

  constructor(public readonly position: THREE.Vector3, public readonly amount: number) {
    this.root.position.copy(position);

    this.glow = createGlowSprite(0x7fe8ff, 2.6, 0.75);
    this.glow.position.y = 1.1;
    this.core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({ color: 0xa8f4ff, emissive: 0x57d8ff, emissiveIntensity: 2.4 }),
    );
    this.core.position.y = 1.1;
    this.root.add(this.glow, this.core);
  }

  /** Returns true once the player has picked it up. */
  public update(dt: number, playerPos: THREE.Vector3): boolean {
    this.time += dt;
    this.core.rotation.y += dt * 1.6;
    const bob = Math.sin(this.time * 2.2) * 0.12;
    this.core.position.y = 1.1 + bob;
    this.glow.position.y = 1.1 + bob;
    this.glow.material.opacity = 0.55 + Math.sin(this.time * 3.1) * 0.2;
    return playerPos.distanceTo(this.position) < PICKUP_RADIUS;
  }

  public dispose(): void {
    this.root.removeFromParent();
    this.core.geometry.dispose();
    (this.core.material as THREE.Material).dispose();
  }
}
