import * as THREE from 'three';
import { EncounterConfig } from './EncounterConfig';
import { EncounterWave } from './EncounterWave';
import { EncounterSpawner } from './EncounterSpawner';
import { Enemy } from '../enemies/Enemy';
import { EventBus } from '../core/EventBus';

export enum EncounterState {
  INACTIVE,
  ACTIVE,
  TRANSITIONING,
  COMPLETED
}

export class Encounter {
  public config: EncounterConfig;
  public state: EncounterState = EncounterState.INACTIVE;
  
  private waves: EncounterWave[] = [];
  private currentWaveIndex: number = 0;
  private transitionTimer: number = 0;
  private spawner: EncounterSpawner;
  
  constructor(config: EncounterConfig, spawner: EncounterSpawner) {
    this.config = config;
    this.spawner = spawner;
    this.reset();
  }

  public reset(): void {
    this.state = EncounterState.INACTIVE;
    this.currentWaveIndex = 0;
    this.transitionTimer = 0;
    this.waves = this.config.waves.map(wCfg => new EncounterWave(wCfg));
  }

  public update(dt: number, playerPos: THREE.Vector3, scene: THREE.Scene): void {
    if (this.state === EncounterState.COMPLETED) return;

    if (this.state === EncounterState.INACTIVE) {
      // Check activation
      if (playerPos.distanceTo(this.config.center) <= this.config.activationRadius) {
        this.activate(scene);
      }
      return;
    }

    if (this.state === EncounterState.ACTIVE) {
      const currentWave = this.waves[this.currentWaveIndex];
      
      // Update leash checks for active enemies
      const activeEnemies = currentWave.getActiveEnemies();
      for (const enemy of activeEnemies) {
        // We set home position during spawn, but we can verify leash distance in AI or here
        // The AI will handle returning to homePosition if too far.
      }

      if (currentWave.isComplete()) {
        if (this.currentWaveIndex < this.waves.length - 1) {
          this.state = EncounterState.TRANSITIONING;
          this.transitionTimer = currentWave.delayAfterComplete;
        } else {
          this.complete();
        }
      }
    }

    if (this.state === EncounterState.TRANSITIONING) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.currentWaveIndex++;
        this.state = EncounterState.ACTIVE;
        this.waves[this.currentWaveIndex].spawn(scene, this.config.center, this.spawner);
      }
    }
  }

  private activate(scene: THREE.Scene): void {
    this.state = EncounterState.ACTIVE;
    this.currentWaveIndex = 0;
    if (this.waves.length > 0) {
      this.waves[0].spawn(scene, this.config.center, this.spawner);
    }
    EventBus.emit('encounterStarted', { id: this.config.id });
  }

  private complete(): void {
    this.state = EncounterState.COMPLETED;
    EventBus.emit('encounterComplete', { id: this.config.id });
  }

  public getActiveEnemies(): Enemy[] {
    if (this.state === EncounterState.INACTIVE || this.state === EncounterState.COMPLETED) {
      return [];
    }
    const active: Enemy[] = [];
    for (const wave of this.waves) {
      if (wave.isSpawned) {
        active.push(...wave.getActiveEnemies());
      }
    }
    return active;
  }

  public cleanup(scene: THREE.Scene): void {
    for (const wave of this.waves) {
      wave.cleanup(scene);
    }
    this.reset();
  }
}
