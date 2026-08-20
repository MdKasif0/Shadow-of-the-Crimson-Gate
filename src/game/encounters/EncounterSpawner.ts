import * as THREE from 'three';
import { Enemy } from '../enemies/Enemy';
import { BasicYokai } from '../enemies/BasicYokai';
import { ShadowYokai } from '../enemies/ShadowYokai';
import { Tengu } from '../enemies/Tengu';

/**
 * EncounterSpawner — Dedicated factory/spawner for encounters.
 * Returns Enemy references that the Encounter system can track.
 */
export class EncounterSpawner {
  public spawnEnemy(type: string, scene: THREE.Scene, position: THREE.Vector3, id: string): Enemy | null {
    let enemy: Enemy;
    switch (type) {
      case 'BASIC_YOKAI':
        enemy = new BasicYokai(id);
        break;
      case 'SHADOW_YOKAI':
        enemy = new ShadowYokai(id);
        break;
      case 'TENGU':
        enemy = new Tengu(id);
        break;
      default:
        console.warn(`Unknown enemy type: ${type}`);
        return null;
    }
    
    enemy.root.position.copy(position);
    scene.add(enemy.root);
    return enemy;
  }
}
