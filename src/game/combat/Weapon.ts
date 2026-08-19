import * as THREE from 'three';

export interface Weapon {
  /** Root mesh of the weapon */
  mesh: THREE.Object3D;
  
  /** Attach weapon to a specific bone slot */
  attachTo(slot: THREE.Group): void;
  
  /** Retrieve weapon properties for combat systems */
  getDamage(): number;
  getRange(): number;
  getHitAngle(): number;
}
