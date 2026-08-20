import * as THREE from 'three';
import { WaveConfig } from './EncounterConfig';
import { Enemy } from '../enemies/Enemy';
import { EncounterSpawner } from './EncounterSpawner';

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
      
      const enemy = spawner.spawnEnemy(def.type, scene, spawnPos, id);
      if (enemy) {
        // Provide the home position for leashing
        enemy.setHomePosition(center);
        this.enemies.push(enemy);
      }
    }
    
    this.isSpawned = true;
  }

  public isComplete(): boolean {
    return this.isSpawned && this.enemies.every(e => e.health.isDead);
  }

  public getActiveEnemies(): Enemy[] {
    // Return all enemies that are still visible (including dead ones that are playing death animations)
    return this.enemies.filter(e => e.root.visible);
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
