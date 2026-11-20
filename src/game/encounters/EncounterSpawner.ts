import * as THREE from 'three';
import { Enemy } from '../enemies/Enemy';
import { BasicYokai } from '../enemies/BasicYokai';
import { ShadowYokai } from '../enemies/ShadowYokai';
import { Tengu } from '../enemies/Tengu';
import { EnemyOptions } from '../enemies/EnemyTraits';
import { EnemyKind } from './EncounterConfig';
import { LevelEnemy } from '../enemies/LevelEnemy';
import { LEVEL_ENEMIES } from '../enemies/LevelEnemyDefs';

/**
 * EncounterSpawner — Builds enemies by kind. Roles such as the shielded yokai or
 * the summoner are variants of the three base enemies.
 */
export class EncounterSpawner {
  public spawnEnemy(type: EnemyKind, scene: THREE.Scene, position: THREE.Vector3, id: string, eliteName?: string): Enemy | null {
    const options: EnemyOptions = { eliteName };
    let enemy: Enemy;
    switch (type) {
      case 'BASIC_YOKAI': enemy = new BasicYokai(id, options); break;
      case 'SHIELDED_YOKAI': enemy = new BasicYokai(id, { ...options, variant: 'SHIELDED' }); break;
      case 'MINION': enemy = new BasicYokai(id, { ...options, variant: 'MINION' }); break;
      case 'SHADOW_YOKAI': enemy = new ShadowYokai(id, options); break;
      case 'SHADOW_CALLER': enemy = new ShadowYokai(id, { ...options, variant: 'SUMMONER' }); break;
      case 'LURKING_SHADE': enemy = new ShadowYokai(id, { ...options, variant: 'AMBUSHER' }); break;
      case 'TENGU': enemy = new Tengu(id, options); break;
      default: {
        const def = LEVEL_ENEMIES[type];
        if (def) {
          enemy = new LevelEnemy(id, def, options);
          enemy.reset(position);
          break;
        }
        console.warn(`Unknown enemy type: ${type}`);
        return null;
      }
    }

    enemy.root.position.copy(position);
    enemy.root.visible = !enemy.traits.isHidden;
    scene.add(enemy.root);
    return enemy;
  }
}
