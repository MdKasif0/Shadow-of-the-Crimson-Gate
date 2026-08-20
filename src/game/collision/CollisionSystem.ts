import * as THREE from 'three';

export class CollisionSystem {
  public boxes: THREE.Box3[] = [];
  public spheres: THREE.Sphere[] = [];

  public addBox(box: THREE.Box3): void {
    this.boxes.push(box);
  }

  public addSphere(center: THREE.Vector3, radius: number): void {
    this.spheres.push(new THREE.Sphere(center, radius));
  }

  /**
   * Resolves cylinder/capsule movement against the registered colliders.
   * Modifies the proposed movement vector to slide along walls if blocked.
   * 
   * @param currentPos The current position of the player (center base)
   * @param desiredMove The un-collided movement vector for this frame
   * @param radius The radius of the player cylinder
   * @returns The resolved movement vector (after sliding/blocking)
   */
  public resolveMovement(currentPos: THREE.Vector3, desiredMove: THREE.Vector3, radius: number): THREE.Vector3 {
    const finalMove = desiredMove.clone();
    if (finalMove.lengthSq() === 0) return finalMove;

    const iterations = 2; // multi-pass for corners
    
    for (let i = 0; i < iterations; i++) {
      const nextPos = currentPos.clone().add(finalMove);
      let collisionNormal: THREE.Vector3 | null = null;
      let maxPenetration = 0;

      // Check Boxes
      for (const box of this.boxes) {
        // Find closest point on box to the cylinder center
        const closestPoint = new THREE.Vector3(
          THREE.MathUtils.clamp(nextPos.x, box.min.x, box.max.x),
          nextPos.y, // Ignore Y for basic 2D capsule collision
          THREE.MathUtils.clamp(nextPos.z, box.min.z, box.max.z)
        );

        const distSq = closestPoint.distanceToSquared(nextPos);
        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const penetration = radius - dist;
          if (penetration > maxPenetration) {
            maxPenetration = penetration;
            if (dist === 0) {
              // Inside the box center (unlikely but handle it)
              collisionNormal = new THREE.Vector3(0, 0, 1);
            } else {
              collisionNormal = nextPos.clone().sub(closestPoint).normalize();
            }
          }
        }
      }

      // Check Spheres
      for (const sphere of this.spheres) {
        const closestY = nextPos.y; 
        const testPoint = new THREE.Vector3(sphere.center.x, closestY, sphere.center.z);
        
        const distSq = testPoint.distanceToSquared(nextPos);
        const combinedRadius = radius + sphere.radius;
        if (distSq < combinedRadius * combinedRadius) {
          const dist = Math.sqrt(distSq);
          const penetration = combinedRadius - dist;
          if (penetration > maxPenetration) {
            maxPenetration = penetration;
            collisionNormal = nextPos.clone().sub(testPoint).normalize();
          }
        }
      }

      // If we hit something, slide!
      if (collisionNormal) {
        // Remove the component of movement that is INTO the normal
        const dot = finalMove.dot(collisionNormal);
        if (dot < 0) {
          const blockVec = collisionNormal.clone().multiplyScalar(dot);
          finalMove.sub(blockVec);
        }
        
        // Also push out slightly if we penetrated
        finalMove.add(collisionNormal.clone().multiplyScalar(maxPenetration + 0.001));
      } else {
        break; // No more collisions
      }
    }

    return finalMove;
  }
}
