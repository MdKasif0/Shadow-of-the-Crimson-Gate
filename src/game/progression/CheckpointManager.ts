import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

export class CheckpointManager {
  private lastCheckpointPos: THREE.Vector3;

  constructor() {
    // Default starting position
    this.lastCheckpointPos = new THREE.Vector3(0, 0, 50);

    EventBus.on('shrineActivated', () => {
      // Shrines are at z = -10, set checkpoint near it
      this.lastCheckpointPos = new THREE.Vector3(0, 0, -5);
    });

    EventBus.on('zoneChanged', (data: { zoneId: string }) => {
      // Set checkpoints at zone transitions
      if (data.zoneId === 'TEMPLE_APPROACH') {
        this.lastCheckpointPos = new THREE.Vector3(0, 0, -90);
      } else if (data.zoneId === 'BOSS_ARENA') {
        this.lastCheckpointPos = new THREE.Vector3(0, 0, -105);
      }
    });
  }

  public getCheckpointPosition(): THREE.Vector3 {
    return this.lastCheckpointPos.clone();
  }

  public setCheckpointPosition(pos: THREE.Vector3): void {
    this.lastCheckpointPos = pos.clone();
  }
}
