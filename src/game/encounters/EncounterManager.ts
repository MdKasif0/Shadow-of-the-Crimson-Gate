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
    for (const enc of this.encounters) {
      active.push(...enc.getActiveEnemies());
    }
    return active;
  }

  public resetAll(scene: THREE.Scene): void {
    for (const enc of this.encounters) {
      enc.cleanup(scene);
    }
  }
}
