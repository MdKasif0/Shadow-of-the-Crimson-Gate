import * as THREE from 'three';
import { EncounterConfig } from './EncounterConfig';
import { Encounter } from './Encounter';
import { EncounterSpawner } from './EncounterSpawner';
import { Enemy } from '../enemies/Enemy';

export class EncounterManager {
  private encounters: Encounter[] = [];
  private spawner: EncounterSpawner;

  constructor() {
    this.spawner = new EncounterSpawner();
  }

  public clearAll(): void {
    this.encounters = [];
  }

  public registerEncounter(config: EncounterConfig): void {
    const enc = new Encounter(config, this.spawner);
    this.encounters.push(enc);
  }

  public update(dt: number, playerPos: THREE.Vector3, scene: THREE.Scene): void {
    for (const enc of this.encounters) {
      enc.update(dt, playerPos, scene);
    }
  }

  public getActiveEnemies(): Enemy[] {
    const active: Enemy[] = [];
    for (const encounter of this.encounters.values()) {
      active.push(...encounter.getActiveEnemies());
    }
    return active;
  }

  public getAllEncounters(): Encounter[] {
    return Array.from(this.encounters.values());
  }

  public resetAll(scene: THREE.Scene): void {
    for (const enc of this.encounters) {
      enc.cleanup(scene);
    }
  }
}
