import * as THREE from 'three';

/**
 * Character — Base interface for all playable and non-playable characters.
 */
export interface Character {
  /** Root scene graph node */
  root: THREE.Group;

  /** Update per frame */
  update(dt: number, ...args: any[]): void;

  /** Reset to a position */
  reset(position: THREE.Vector3): void;

  /** Set world position */
  setPosition?(x: number, y: number, z: number): void;
}
