import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';

export interface Collider {
  type: 'box' | 'circle';
  // Check if a point with a radius intersects this collider
  intersects(position: THREE.Vector3, radius: number): boolean;
}

export class BoxCollider implements Collider {
  public type: 'box' = 'box';
  public box: THREE.Box3;

  constructor(box: THREE.Box3) {
    this.box = box;
  }

  public intersects(position: THREE.Vector3, radius: number): boolean {
    // Treat the player as an AABB for the box check, or do a proper circle-AABB test
    // Simple AABB-AABB test treating player radius as a square box around them
    const playerBox = new THREE.Box3(
      new THREE.Vector3(position.x - radius, position.y - 0.5, position.z - radius),
      new THREE.Vector3(position.x + radius, position.y + 2.0, position.z + radius)
    );
    return this.box.intersectsBox(playerBox);
  }
}

export class CircleCollider implements Collider {
  public type: 'circle' = 'circle';
  public center: THREE.Vector3;
  public radius: number;

  constructor(center: THREE.Vector3, radius: number) {
    this.center = center;
    this.radius = radius;
  }

  public intersects(position: THREE.Vector3, playerRadius: number): boolean {
    const dx = position.x - this.center.x;
    const dz = position.z - this.center.z;
    const distSq = dx * dx + dz * dz;
    const totalRadius = this.radius + playerRadius;
    return distSq < totalRadius * totalRadius;
  }
}

export class CollisionSystem {
  private colliders: Collider[] = [];
  private debugGroup: THREE.Group;
  private isDebug: boolean = GAME_CONFIG.DEBUG_MODE;

  constructor(scene: THREE.Scene) {
    this.debugGroup = new THREE.Group();
    if (this.isDebug) {
      scene.add(this.debugGroup);
    }
  }

  public addBox(box: THREE.Box3): void {
    this.colliders.push(new BoxCollider(box));
    
    if (this.isDebug) {
      const helper = new THREE.Box3Helper(box, new THREE.Color(0xff0000));
      this.debugGroup.add(helper);
    }
  }

  public addCircle(center: THREE.Vector3, radius: number): void {
    this.colliders.push(new CircleCollider(center, radius));
    
    if (this.isDebug) {
      const geo = new THREE.CylinderGeometry(radius, radius, 4, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(center);
      this.debugGroup.add(mesh);
    }
  }

  public canMoveTo(position: THREE.Vector3, radius: number = 0.5): boolean {
    // 1. World bounds check
    const bounds = GAME_CONFIG.WORLD.BOUNDS;
    if (position.x - radius < bounds.minX || position.x + radius > bounds.maxX ||
        position.z - radius < bounds.minZ || position.z + radius > bounds.maxZ) {
      return false;
    }

    // 2. Obstacle check
    for (const collider of this.colliders) {
      if (collider.intersects(position, radius)) {
        return false;
      }
    }

    return true;
  }
}
