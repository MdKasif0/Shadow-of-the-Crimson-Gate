import * as THREE from 'three';

export interface Hurtbox {
  entityId: string;
  position: THREE.Vector3;
  radius: number;
  active: boolean;
}
