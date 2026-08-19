import * as THREE from 'three';
import { HealthComponent } from '../combat/HealthComponent';
import { EnemyState } from './EnemyState';

export interface Enemy {
  id: string;
  root: THREE.Group;
  health: HealthComponent;
  state: EnemyState;

  update(dt: number, playerPos: THREE.Vector3, hitboxSystem: any): void;
  takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number): void;
}
