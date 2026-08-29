import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyState } from './EnemyState';
import { HealthComponent, HealthEventPayload } from '../combat/HealthComponent';
import { CharacterRig } from '../characters/CharacterRig';
import { EnemyAnimator } from './EnemyAnimator';
import { EnemyFactory } from './EnemyFactory';
import { HitboxSystem } from '../combat/HitboxSystem';
import { EnemyAI } from './EnemyAI';
import { BASIC_YOKAI_CONFIG, EnemyConfig } from './EnemyConfig';
import { AttackRole } from '../combat/AttackDirector';
import { AudioManager } from '../audio/AudioManager';

export class BasicYokai implements Enemy {
  public id: string;
  public enemyType: string = 'BASIC_YOKAI';
  public root: THREE.Group;
  public health: HealthComponent;
  public state: EnemyState = EnemyState.IDLE;
  public config: EnemyConfig = BASIC_YOKAI_CONFIG;

  private rig: CharacterRig;
  private animator: EnemyAnimator;
  private ai: EnemyAI;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private stateTimer: number = 0;
  private isDeathVfxPlayed: boolean = false;
  private attackCooldown: number = 0;
  private role: AttackRole = AttackRole.PRIMARY_MELEE;
  private homePosition: THREE.Vector3 | null = null;

  public assignRole(role: AttackRole): void {
    this.role = role;
  }

  public setHomePosition(pos: THREE.Vector3): void {
    this.homePosition = pos.clone();
  }

  constructor(id: string) {
    this.id = id;
    this.root = new THREE.Group();
    this.root.name = `BasicYokai_${id}`;

    this.rig = EnemyFactory.createBasicYokai();
    this.root.add(this.rig.root);

    this.animator = new EnemyAnimator(this.rig);
    this.ai = new EnemyAI(this.config);

    this.health = new HealthComponent(this.config.maxHealth);
    this.health.onDamage(this.onDamageTaken.bind(this));
    this.health.onDeath(this.onDeath.bind(this));
  }

  public takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number): void {
    if (this.health.isDead) return;

    // Apply knockback, mitigated by resistance
    const effectiveKnockback = knockbackPower * (1 - this.config.knockbackResistance);
    this.velocity.copy(knockbackDir).multiplyScalar(effectiveKnockback);
    
    this.health.takeDamage(amount, 'PLAYER');
  }

  private onDamageTaken(event: HealthEventPayload): void {
    if (this.health.isDead) return;
    this.setState(EnemyState.HURT);
  }

  private onDeath(event: HealthEventPayload): void {
    this.setState(EnemyState.DEAD);
  }

  public reset(position: THREE.Vector3): void {
    this.root.position.copy(position);
    this.health['currentHealth'] = this.health['maxHealth'];
    this.health.isDead = false;
    this.velocity.set(0, 0, 0);
    this.attackCooldown = 0;
    this.isDeathVfxPlayed = false;
    this.setState(EnemyState.IDLE);
    this.root.rotation.set(0, 0, 0);
    this.root.scale.setScalar(1);
    this.root.visible = true;
    this.ai.resetStrafe();
  }

  private setState(newState: EnemyState): void {
    if (this.state === EnemyState.DEAD) return;
    this.state = newState;
    this.stateTimer = 0;
    this.animator.setState(newState);
  }

  public update(dt: number, playerPos: THREE.Vector3, hitboxSystem: HitboxSystem, collisionSystem: any, vfx?: any, projectileSystem?: any, allEnemies?: Enemy[]): void {
    this.stateTimer += dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    this.animator.update(dt);

    if (this.state === EnemyState.DEAD) {
      if (!this.isDeathVfxPlayed && vfx) {
        vfx.spawnDeath(this.root.position);
        this.isDeathVfxPlayed = true;
      }
      
      // Sink into the ground / shrink slowly after laying dead for 1 second
      if (this.stateTimer > 1.0) {
        const shrinkFactor = 1.0 - (this.stateTimer - 1.0) * 2.0; // Shrink over 0.5s
        if (shrinkFactor > 0) {
          this.root.scale.setScalar(shrinkFactor);
        } else {
          this.root.visible = false;
        }
      }

      this.applyVelocity(dt, collisionSystem);
      return; 
    }

    hitboxSystem.registerHurtbox({
      id: this.id,
      position: this.root.position.clone(),
      radius: this.config.hurtboxRadius,
      height: this.config.hurtboxHeight
    });

    if (this.state === EnemyState.HURT) {
      this.applyVelocity(dt, collisionSystem);
      if (this.stateTimer > this.config.hurtDuration) {
        this.setState(EnemyState.IDLE);
      }
      return;
    }

    if (this.state === EnemyState.ATTACK) {
      this.handleAttackLogic(dt, hitboxSystem);
      this.applyVelocity(dt, collisionSystem);
      return;
    }

    // ─── Separation Force ───
    if (allEnemies) {
      for (const other of allEnemies) {
        if (other.id === this.id || other.health.isDead) continue;
        const dist = this.root.position.distanceTo(other.root.position);
        if (dist < this.config.collisionRadius * 2.5) {
          const pushDir = this.root.position.clone().sub(other.root.position);
          pushDir.y = 0;
          if (pushDir.lengthSq() > 0.001) {
            pushDir.normalize();
            this.velocity.add(pushDir.multiplyScalar(20 * dt));
          }
        }
      }
    }

    // ─── AI Decision ───
    const decision = this.ai.decide(this.root.position, playerPos, this.attackCooldown, this.state, dt, this.role, this.homePosition);
    
    if (this.state !== decision.state) {
      if (decision.state === EnemyState.ATTACK) {
        AudioManager.playEnemyAttack();
      }
      this.setState(decision.state);
    }

    if (this.state === EnemyState.WALK || this.state === EnemyState.STRAFE || this.state === EnemyState.RETREAT) {
      this.velocity.copy(decision.moveDirection).multiplyScalar(this.config.movementSpeed);
    } else {
      this.velocity.set(0, 0, 0);
    }

    let targetY = decision.facingAngle;
    let currentY = this.root.rotation.y;
    while (currentY <= -Math.PI) currentY += Math.PI * 2;
    while (currentY > Math.PI) currentY -= Math.PI * 2;
    
    let diff = targetY - currentY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    // Slower rotation than Shadow Yokai (heavy/hunched)
    this.root.rotation.y = currentY + diff * dt * 5.0;

    this.applyVelocity(dt, collisionSystem);
  }

  private handleAttackLogic(dt: number, hitboxSystem: HitboxSystem) {
    const { attackWindup, attackActive, attackRecovery, damage, knockback } = this.config;
    const activeStart = attackWindup;
    const activeEnd = attackWindup + attackActive;
    const totalTime = attackWindup + attackActive + attackRecovery;

    if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
      if (this.stateTimer - dt < activeStart) {
        hitboxSystem.resetAttackMemory(this.id);
      }

      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.root.rotation.y);
      hitboxSystem.addActiveHitbox({
        ownerId: this.id,
        damage: damage,
        position: this.root.position.clone(),
        direction: forward,
        range: this.config.attackRange,
        hitAngle: Math.PI / 2, // Wide swing
        knockback: knockback
      });
      
      // Heavy forward lunge
      this.velocity.copy(forward).multiplyScalar(5);
    } else {
      this.velocity.set(0, 0, 0); 
    }

    if (this.stateTimer >= totalTime) {
      this.setState(EnemyState.IDLE);
      this.attackCooldown = this.config.attackCooldownMin + Math.random() * (this.config.attackCooldownMax - this.config.attackCooldownMin);
    }
  }

  private applyVelocity(dt: number, collisionSystem: any): void {
    let damping = 10.0;
    if (this.state === EnemyState.HURT || this.state === EnemyState.DEAD) {
      damping = 5.0; 
    }

    this.velocity.lerp(new THREE.Vector3(0, 0, 0), dt * damping);

    if (this.velocity.lengthSq() > 0.01) {
      const resolvedMove = collisionSystem.resolveMovement(
        this.root.position, 
        this.velocity.clone().multiplyScalar(dt), 
        this.config.collisionRadius
      );
      this.root.position.add(resolvedMove);
      
      const bounds = { MIN_X: -28, MAX_X: 28, MIN_Z: -28, MAX_Z: 28 };
      this.root.position.x = THREE.MathUtils.clamp(this.root.position.x, bounds.MIN_X, bounds.MAX_X);
      this.root.position.z = THREE.MathUtils.clamp(this.root.position.z, bounds.MIN_Z, bounds.MAX_Z);
    }
  }
}
