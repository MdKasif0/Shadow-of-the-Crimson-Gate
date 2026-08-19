import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';

export interface Collider {
  type: 'box' | 'circle';
  intersects(position: THREE.Vector3, radius: number): boolean;
}

class BoxCollider implements Collider {
  public type: 'box' = 'box';
  constructor(public box: THREE.Box3) {}
  public intersects(position: THREE.Vector3, radius: number): boolean {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(position.x - radius, 0, position.z - radius),
      new THREE.Vector3(position.x + radius, 2, position.z + radius)
    );
    return this.box.intersectsBox(playerBox);
  }
}

class CircleCollider implements Collider {
  public type: 'circle' = 'circle';
  constructor(public center: THREE.Vector3, public radius: number) {}
  public intersects(position: THREE.Vector3, playerRadius: number): boolean {
    const dx = position.x - this.center.x;
    const dz = position.z - this.center.z;
    const totalR = this.radius + playerRadius;
    return dx * dx + dz * dz < totalR * totalR;
  }
}

export class CollisionSystem {
  private colliders: Collider[] = [];

  public addBox(box: THREE.Box3): void { this.colliders.push(new BoxCollider(box)); }
  public addCircle(center: THREE.Vector3, radius: number): void {
    this.colliders.push(new CircleCollider(center, radius));
  }

  public canMoveTo(position: THREE.Vector3, radius: number = 0.4): boolean {
    const b = GAME_CONFIG.WORLD.BOUNDS;
    if (position.x - radius < b.minX || position.x + radius > b.maxX ||
        position.z - radius < b.minZ || position.z + radius > b.maxZ) return false;
    for (const c of this.colliders) {
      if (c.intersects(position, radius)) return false;
    }
    return true;
  }
}
