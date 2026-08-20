import * as THREE from 'three';

export interface EnemySpawnDef {
  type: 'BASIC_YOKAI' | 'SHADOW_YOKAI' | 'TENGU';
  offset: THREE.Vector3; // Relative to encounter center
}

export interface WaveConfig {
  enemies: EnemySpawnDef[];
  delayAfterComplete: number; // seconds to wait before next wave
}

export interface EncounterConfig {
  id: string;
  center: THREE.Vector3;
  activationRadius: number;
  leashRadius: number; // Max distance an enemy will chase
  waves: WaveConfig[];
}
