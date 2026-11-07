import * as THREE from 'three';
import { HealthComponent } from '../combat/HealthComponent';
import { EnemyState } from './EnemyState';
import { AttackRole } from '../combat/AttackDirector';
import { CharacterGlow } from '../utils/RimLight';
import { AttackShape } from '../vfx/AttackTelegraph';
import { EnemyTraits } from './EnemyTraits';

export interface Enemy {
  id: string;
  enemyType: string;
  root: THREE.Group;
  health: HealthComponent;
  state: EnemyState;
  glow: CharacterGlow;
  /** True while stunned by a heavy blow. Staggered enemies take extra damage. */
  isStaggered: boolean;
  /** Runs 0 to 1 over the windup of an attack, and is 0 otherwise. */
  attackWarning: number;
  attackShape: AttackShape;
  /** Role, elite status and guard. */
  traits: EnemyTraits;

  update(dt: number, playerPos: THREE.Vector3, hitboxSystem: any, collisionSystem: any, vfx?: any, projectileSystem?: any, allEnemies?: Enemy[]): void;
  takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number, staggerSeconds?: number): void;
  reset(position: THREE.Vector3): void;
  /** Leaves the enemy reeling for this long, open to an execution. */
  breakGuard(seconds: number): void;
  assignRole(role: AttackRole): void;
  setHomePosition(position: THREE.Vector3): void;
}
