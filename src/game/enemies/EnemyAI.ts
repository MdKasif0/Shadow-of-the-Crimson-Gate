import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';
import { CharacterAnimator } from '../characters/CharacterAnimator';
import { HealthSystem } from '../combat/HealthSystem';

export type AIState = 'idle' | 'detect' | 'approach' | 'attack' | 'recover' | 'hurt' | 'dead';

export class EnemyAI {
  public state: AIState = 'idle';
  public health: HealthSystem;
  public group: THREE.Group;
  public animator: CharacterAnimator;
  public hurtTimer: number = 0;
  private stateTimer: number = 0;
  private attackTimer: number = 0;
  private attackPhase: 'none' | 'windup' | 'active' | 'recovery' = 'none';
  public attackHitboxActive: boolean = false;

  constructor(group: THREE.Group, animator: CharacterAnimator) {
    this.group = group;
    this.animator = animator;
    this.health = new HealthSystem(GAME_CONFIG.ENEMY.YOKAI.MAX_HP);
  }

  public update(dt: number, playerPos: THREE.Vector3): void {
    this.stateTimer += dt;
    const cfg = GAME_CONFIG.ENEMY.YOKAI;
    const myPos = this.group.position;
    const dist = myPos.distanceTo(playerPos);
    this.attackHitboxActive = false;

    switch (this.state) {
      case 'idle':
        this.animator.setState('idle');
        if (dist < cfg.DETECT_RANGE) this.transitionTo('detect');
        break;

      case 'detect':
        this.animator.setState('idle');
        this.lookAt(playerPos);
        if (this.stateTimer > 0.5) this.transitionTo('approach');
        break;

      case 'approach':
        this.animator.setState('walk');
        this.lookAt(playerPos);
        if (dist > cfg.ATTACK_RANGE) {
          const dir = new THREE.Vector3().subVectors(playerPos, myPos).normalize();
          myPos.add(dir.multiplyScalar(cfg.SPEED * dt));
        } else {
          this.transitionTo('attack');
        }
        break;

      case 'attack':
        this.attackTimer += dt;
        this.lookAt(playerPos);
        if (this.attackTimer < cfg.ATTACK_WINDUP) {
          this.attackPhase = 'windup';
          this.animator.setState('attack1');
        } else if (this.attackTimer < cfg.ATTACK_WINDUP + cfg.ATTACK_ACTIVE) {
          this.attackPhase = 'active';
          this.attackHitboxActive = true;
        } else if (this.attackTimer < cfg.ATTACK_WINDUP + cfg.ATTACK_ACTIVE + cfg.ATTACK_RECOVERY) {
          this.attackPhase = 'recovery';
        } else {
          this.transitionTo('recover');
        }
        break;

      case 'recover':
        this.animator.setState('idle');
        if (this.stateTimer > 0.5) {
          this.transitionTo(dist < cfg.ATTACK_RANGE ? 'attack' : 'approach');
        }
        break;

      case 'hurt':
        this.animator.setState('hurt');
        this.hurtTimer -= dt;
        if (this.hurtTimer <= 0) {
          this.transitionTo(this.health.isDead ? 'dead' : 'approach');
        }
        break;

      case 'dead':
        this.animator.setState('death');
        break;
    }

    this.animator.update(dt, this.state === 'approach');
  }

  public takeDamage(amount: number): void {
    if (this.state === 'dead') return;
    this.health.takeDamage(amount);
    this.transitionTo('hurt');
    this.hurtTimer = 0.3;
  }

  private transitionTo(newState: AIState): void {
    this.state = newState;
    this.stateTimer = 0;
    if (newState === 'attack') {
      this.attackTimer = 0;
      this.attackPhase = 'none';
    }
  }

  private lookAt(target: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(target, this.group.position);
    dir.y = 0;
    if (dir.lengthSq() > 0.001) {
      const angle = Math.atan2(dir.x, dir.z);
      this.group.rotation.y = angle;
    }
  }

  public reset(spawnPos: THREE.Vector3): void {
    this.health.reset();
    this.state = 'idle';
    this.stateTimer = 0;
    this.attackTimer = 0;
    this.hurtTimer = 0;
    this.group.position.copy(spawnPos);
    this.group.visible = true;
  }
}
