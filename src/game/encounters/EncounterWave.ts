import * as THREE from 'three';
import { WaveConfig } from './EncounterConfig';
import { Enemy } from '../enemies/Enemy';
import { EncounterSpawner } from './EncounterSpawner';
import { EnemyKind } from './EncounterConfig';
import { EventBus } from '../core/EventBus';

export class EncounterWave {
  private config: WaveConfig;
  public enemies: Enemy[] = [];
  public isSpawned: boolean = false;

  constructor(config: WaveConfig) {
    this.config = config;
  }

  public get delayAfterComplete(): number {
    return this.config.delayAfterComplete;
  }

  public spawn(scene: THREE.Scene, center: THREE.Vector3, spawner: EncounterSpawner): void {
    if (this.isSpawned) return;
    
    this.enemies = [];
    for (let i = 0; i < this.config.enemies.length; i++) {
      const def = this.config.enemies[i];
      const spawnPos = center.clone().add(def.offset);
      const id = `enc_enemy_${Math.random().toString(36).substr(2, 9)}`;
      
      const enemy = spawner.spawnEnemy(def.type, scene, spawnPos, id, def.eliteName);
      if (enemy) this.adopt(enemy, scene, center, spawner);
    }
    
    this.isSpawned = true;
  }

  /** Tracks an enemy, and lets it raise minions that count towards this wave. */
  private adopt(enemy: Enemy, scene: THREE.Scene, center: THREE.Vector3, spawner: EncounterSpawner): void {
    enemy.setHomePosition(center);
    this.enemies.push(enemy);

    enemy.traits.onSummon = (type, position) => {
      const id = `enc_minion_${Math.random().toString(36).slice(2, 11)}`;
      const minion = spawner.spawnEnemy(type as EnemyKind, scene, position, id);
      if (!minion) return;
      minion.health.onDeath(() => { enemy.traits.minionCount = Math.max(0, enemy.traits.minionCount - 1); });
      this.adopt(minion, scene, center, spawner);
      EventBus.emit('enemySummoned', { position: position.clone() });
    };
  }

  public isComplete(): boolean {
    return this.isSpawned && this.enemies.every(e => e.health.isDead);
  }

  public getActiveEnemies(): Enemy[] {
    // Still visible, including the dead mid-way through dying, plus anyone lying in wait
    return this.enemies.filter(e => e.root.visible || (!e.health.isDead && e.traits.isHidden));
  }

  public cleanup(scene: THREE.Scene): void {
    for (const enemy of this.enemies) {
      if (enemy.root.parent) {
        scene.remove(enemy.root);
      }
    }
    this.enemies = [];
    this.isSpawned = false;
  }
}
