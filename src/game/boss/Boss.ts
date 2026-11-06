import * as THREE from 'three';
import { HealthComponent } from '../combat/HealthComponent';
import { HitboxSystem } from '../combat/HitboxSystem';
import { VFXManager } from '../vfx/VFXManager';
import { BossState } from './BossState';
import { BossPhaseId } from './BossPhase';
import { CharacterGlow } from '../utils/RimLight';
import { AttackShape } from '../vfx/AttackTelegraph';

/**
 * Boss — Entity interface for major boss characters.
 * Separate from the Enemy interface because bosses have their own
 * state machine, phase system, and AI architecture.
 */
export interface Boss {
  id: string;
  root: THREE.Group;
  health: HealthComponent;
  state: BossState;
  phase: BossPhaseId;
  glow: CharacterGlow;
  isStaggered: boolean;
  attackWarning: number;
  attackShape: AttackShape;

  update(
    dt: number,
    playerPos: THREE.Vector3,
    hitboxSystem: HitboxSystem,
    collisionSystem: any,
    vfx?: VFXManager
  ): void;

  takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number): void;
  reset(position: THREE.Vector3): void;
}
