import * as THREE from 'three';

export interface Hitbox {
  id: string;
  sourceId: string; // ID of the entity that created the hitbox
  position: THREE.Vector3;
  radius: number;
  damage: number;
  active: boolean;
}
