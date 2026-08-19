import * as THREE from 'three';

export interface HitboxData {
  id: string;
  position: THREE.Vector3;
  radius: number;
  damage: number;
  sourceId: string;
  hitEntities: Set<string>; // Prevent multi-hit
}

export class HitboxSystem {
  private activeHitboxes: HitboxData[] = [];

  public createHitbox(sourceId: string, position: THREE.Vector3, radius: number, damage: number): HitboxData {
    const hb: HitboxData = {
      id: `hb_${Date.now()}_${Math.random()}`,
      position: position.clone(), radius, damage, sourceId,
      hitEntities: new Set(),
    };
    this.activeHitboxes.push(hb);
    return hb;
  }

  public removeHitbox(id: string): void {
    this.activeHitboxes = this.activeHitboxes.filter(h => h.id !== id);
  }

  /** Check overlap between active hitboxes and a hurtbox sphere */
  public checkHit(entityId: string, entityPos: THREE.Vector3, entityRadius: number): HitboxData | null {
    for (const hb of this.activeHitboxes) {
      if (hb.sourceId === entityId) continue; // Can't hit yourself
      if (hb.hitEntities.has(entityId)) continue; // Already hit
      const dist = hb.position.distanceTo(entityPos);
      if (dist < hb.radius + entityRadius) {
        hb.hitEntities.add(entityId);
        return hb;
      }
    }
    return null;
  }

  public clear(): void { this.activeHitboxes = []; }
}
