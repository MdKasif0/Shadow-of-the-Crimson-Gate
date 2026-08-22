import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';

export interface Hurtbox {
  id: string; // ID of the entity that owns this hurtbox
  position: THREE.Vector3;
  radius: number;
  height: number;
}

export interface Hitbox {
  ownerId: string;
  damage: number;
  position: THREE.Vector3; 
  direction: THREE.Vector3; // Forward direction of the attacker
  range: number;
  hitAngle: number; // e.g. Math.PI / 2 for a 90 degree front cone
  knockback: number;
  hitboxType?: 'ARC' | 'RADIAL' | 'CONTINUOUS';
}

export interface HitEvent {
  hitbox: Hitbox;
  hurtbox: Hurtbox;
}

export class HitboxSystem {
  private hurtboxes: Map<string, Hurtbox> = new Map();
  private activeHitboxes: Hitbox[] = [];
  
  // Tracks which entities have already been hit by the current swing
  // Key: ownerId, Value: Set of hit entity IDs
  private alreadyHit: Map<string, Set<string>> = new Map();

  // Debug visualization
  private debugGroup: THREE.Group;
  private debugMeshes: Map<string, THREE.Mesh> = new Map();

  constructor(scene: THREE.Scene) {
    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'HitboxDebug';
    if (GAME_CONFIG.DEBUG_MODE) {
      scene.add(this.debugGroup);
    }
  }

  public registerHurtbox(hurtbox: Hurtbox): void {
    this.hurtboxes.set(hurtbox.id, hurtbox);
    this.updateDebugMesh(hurtbox.id, hurtbox, 0x00ff00); // Green for hurtbox
  }

  public unregisterHurtbox(id: string): void {
    this.hurtboxes.delete(id);
    const mesh = this.debugMeshes.get(id);
    if (mesh) {
      this.debugGroup.remove(mesh);
      this.debugMeshes.delete(id);
    }
  }

  public clearActiveHitboxes(): void {
    this.activeHitboxes = [];
    
    // Clear hitbox debug meshes
    Array.from(this.debugMeshes.keys()).forEach(key => {
      if (key.startsWith('hitbox_')) {
        const mesh = this.debugMeshes.get(key);
        if (mesh) this.debugGroup.remove(mesh);
        this.debugMeshes.delete(key);
      }
    });
  }

  public addActiveHitbox(hitbox: Hitbox): void {
    this.activeHitboxes.push(hitbox);
    
    // Create an arbitrary ID for debug
    const debugId = 'hitbox_' + hitbox.ownerId;
    this.updateDebugMesh(debugId, { 
      id: debugId, position: hitbox.position, radius: hitbox.range, height: 0.1 
    }, 0xff0000, 0.2); // Red for hitbox, transparent
  }

  public resetAttackMemory(ownerId: string): void {
    this.alreadyHit.set(ownerId, new Set());
  }

  public checkHits(): HitEvent[] {
    const hits: HitEvent[] = [];

    for (const hitbox of this.activeHitboxes) {
      let hitSet = this.alreadyHit.get(hitbox.ownerId);
      if (!hitSet) {
        hitSet = new Set();
        this.alreadyHit.set(hitbox.ownerId, hitSet);
      }

      for (const [id, hurtbox] of this.hurtboxes) {
        // Prevent self-damage or double-hitting
        if (hitbox.ownerId === id || hitSet.has(id)) continue;

        // 1. Check distance
        // Hurtbox is a simple sphere/cylinder approximation
        const dx = hurtbox.position.x - hitbox.position.x;
        const dz = hurtbox.position.z - hitbox.position.z;
        const distSq = dx * dx + dz * dz;
        
        const combinedRadius = hitbox.range + hurtbox.radius;

        if (distSq <= combinedRadius * combinedRadius) {
          // 2. Check angle based on type
          if (hitbox.hitboxType === 'RADIAL') {
            // Hit confirmed (360 degrees)
            hits.push({ hitbox, hurtbox });
            hitSet.add(id);
          } else {
            // ARC or CONTINUOUS (cone check)
            const toTarget = new THREE.Vector3(dx, 0, dz).normalize();
            const forward = hitbox.direction.clone().setY(0).normalize();
            
            const angle = forward.angleTo(toTarget);
            
            if (angle <= hitbox.hitAngle / 2) {
              // Hit confirmed
              hits.push({ hitbox, hurtbox });
              hitSet.add(id);
            }
          }
        }
      }
    }

    return hits;
  }

  public update(): void {
    // Sync debug meshes if needed
    if (!GAME_CONFIG.DEBUG_MODE) return;
    
    for (const [id, hurtbox] of this.hurtboxes) {
      const mesh = this.debugMeshes.get(id);
      if (mesh) {
        mesh.position.copy(hurtbox.position);
      }
    }
  }

  private updateDebugMesh(id: string, box: Hurtbox, color: number, opacity: number = 0.4): void {
    if (!GAME_CONFIG.DEBUG_MODE) return;

    let mesh = this.debugMeshes.get(id);
    if (!mesh) {
      const geo = new THREE.CylinderGeometry(box.radius, box.radius, box.height, 16);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
      mesh = new THREE.Mesh(geo, mat);
      this.debugGroup.add(mesh);
      this.debugMeshes.set(id, mesh);
    }
    mesh.position.copy(box.position);
    mesh.position.y += box.height / 2; // Offset so base is at position
  }
}
