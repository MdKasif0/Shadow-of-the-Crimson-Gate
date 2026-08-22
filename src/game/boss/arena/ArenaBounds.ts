import * as THREE from 'three';
import { CollisionSystem } from '../../collision/CollisionSystem';

/**
 * ArenaBounds — Generates a circular collision boundary using overlapping boxes.
 */
export class ArenaBounds {
  public static registerCircularBounds(
    collisionSystem: CollisionSystem,
    center: THREE.Vector3,
    radius: number,
    numSegments: number = 16
  ): void {
    const angleStep = (Math.PI * 2) / numSegments;
    const boxThickness = 2;
    const boxHeight = 10;
    
    // Length of each chord
    const segmentLength = 2 * radius * Math.tan(Math.PI / numSegments) + 1; // +1 for overlap

    for (let i = 0; i < numSegments; i++) {
      const angle = i * angleStep;
      
      // Leave a gap for the entrance (around angle Math.PI / 2)
      // Math.PI / 2 is approximately 1.57. Let's skip angles between 1.1 and 2.0.
      if (angle > 1.1 && angle < 2.0) {
        continue;
      }
      
      // Calculate position of the box center
      const bx = center.x + Math.cos(angle) * radius;
      const bz = center.z + Math.sin(angle) * radius;
      
      // We can't rotate AABB (Box3), so we have to use multiple small axis-aligned boxes
      // to approximate a circle, OR just make sure the player stays within radius mathematically.
      // Since CollisionSystem only supports Box3 right now, we will add many small boxes.
      
      // To make a decent approximation without rotating boxes, we'll place square boxes.
      const sBoxSize = 3.5;
      const sBox = new THREE.Box3(
        new THREE.Vector3(bx - sBoxSize / 2, 0, bz - sBoxSize / 2),
        new THREE.Vector3(bx + sBoxSize / 2, boxHeight, bz + sBoxSize / 2)
      );
      
      collisionSystem.addBox(sBox);
    }
  }
}
