import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyState } from './EnemyState';
import { HealthComponent, HealthEventPayload } from '../combat/HealthComponent';
import { CharacterRig } from '../characters/CharacterRig';
import { TenguAnimator } from './TenguAnimator';
import { EnemyFactory } from './EnemyFactory';
import { HitboxSystem } from '../combat/HitboxSystem';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { AttackRole } from '../combat/AttackDirector';
import { EnemyAI } from './EnemyAI';
import { TENGU_CONFIG, EnemyConfig } from './EnemyConfig';
import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';

export class Tengu implements Enemy {
  public id: string;
  public enemyType: string = 'TENGU';
  public root: THREE.Group;
  public health: HealthComponent;
  public state: EnemyState = EnemyState.IDLE;
  public config: EnemyConfig = TENGU_CONFIG;

  private rig: CharacterRig;
  private animator: TenguAnimator;
  private ai: EnemyAI;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private stateTimer: number = 0;
  private isDeathVfxPlayed: boolean = false;
  private attackCooldown: number = 0;
  private role: AttackRole = AttackRole.SUPPORT;
  private homePosition: THREE.Vector3 | null = null;
  private wingFlapTimer: number = 1.0 + Math.random();

  public assignRole(role: AttackRole): void {
    this.role = role;
  }

  public setHomePosition(pos: THREE.Vector3): void {
    this.homePosition = pos.clone();
  }

  constructor(id: string) {
    this.id = id;
    this.root = new THREE.Group();
    this.root.name = `Tengu_${id}`;

    this.rig = EnemyFactory.createTengu();
    this.root.add(this.rig.root);

    this.animator = new TenguAnimator(this.rig);
    this.ai = new EnemyAI(this.config);

    this.health = new HealthComponent(this.config.maxHealth);
    this.health.onDamage(this.onDamageTaken.bind(this));
    this.health.onDeath(this.onDeath.bind(this));
  }

  public takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number): void {
    if (this.health.isDead) return;

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

  public update(dt: number, playerPos: THREE.Vector3, hitboxSystem: HitboxSystem, collisionSystem: any, vfx?: any, projectileSystem?: ProjectileSystem, allEnemies?: Enemy[]): void {
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
        const shrinkFactor = 1.0 - (this.stateTimer - 1.0) * 2.0;
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
      this.handleAttackLogic(dt, projectileSystem);
      this.applyVelocity(dt, collisionSystem); // mostly hover/drifting
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
        AudioManager.play(AudioId.TENGU_ATTACK, { pitchMin: 0.95, pitchMax: 1.05 });
      }
      this.setState(decision.state);
    }

    // Occasional wing flaps in flight
    this.wingFlapTimer -= dt;
    if (this.wingFlapTimer <= 0) {
      this.wingFlapTimer = 1.2 + Math.random() * 0.8;
      if (this.root.position.distanceTo(playerPos) < 20) {
        AudioManager.playRandom([AudioId.TENGU_WING_FLAP_01, AudioId.TENGU_WING_FLAP_02], {
          volume: 0.25,
          pitchMin: 0.95,
          pitchMax: 1.05
        });
      }
    }

    if (this.state === EnemyState.WALK || this.state === EnemyState.MAINTAIN_DISTANCE || this.state === EnemyState.STRAFE || this.state === EnemyState.RETREAT) {
      this.velocity.copy(decision.moveDirection).multiplyScalar(this.config.movementSpeed);
    } else {
      // Damping
      this.velocity.lerp(new THREE.Vector3(0,0,0), dt * 5);
    }

    let targetY = decision.facingAngle;
    let currentY = this.root.rotation.y;
    while (currentY <= -Math.PI) currentY += Math.PI * 2;
    while (currentY > Math.PI) currentY -= Math.PI * 2;
    
    let diff = targetY - currentY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    this.root.rotation.y = currentY + diff * dt * 6.0;

    this.applyVelocity(dt, collisionSystem);
  }

  private handleAttackLogic(dt: number, projectileSystem?: ProjectileSystem) {
    const { attackWindup, attackActive, attackRecovery, damage, knockback } = this.config;
    const activeStart = attackWindup;
    const activeEnd = attackWindup + attackActive;
    const totalTime = attackWindup + attackActive + attackRecovery;

    if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
      if (this.stateTimer - dt < activeStart && projectileSystem) {
        // Fire projectile sound
        AudioManager.play(AudioId.TENGU_PROJECTILE, { pitchMin: 0.95, pitchMax: 1.05 });

        // Fire projectile
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.root.rotation.y);
        const spawnPos = this.root.position.clone();
        spawnPos.y += 1.5; // roughly chest/head height
        spawnPos.add(forward.clone().multiplyScalar(1.0)); // spawn slightly ahead

        projectileSystem.spawnProjectile(
          this.id,
          spawnPos,
          forward,
          this.config.projectileSpeed || 15,
          damage,
          knockback,
          this.config.projectileLifetime || 3.0
        );
      }
      this.velocity.lerp(new THREE.Vector3(0,0,0), dt * 10);
    }

    if (this.stateTimer >= totalTime) {
      this.setState(EnemyState.IDLE);
      this.attackCooldown = this.config.attackCooldownMin + Math.random() * (this.config.attackCooldownMax - this.config.attackCooldownMin);
    }
  }

  private applyVelocity(dt: number, collisionSystem: any): void {
    if (this.state !== EnemyState.DEAD) {
      // Hover spring mechanics
      const targetHover = 1.0;
      const hoverForce = (targetHover - this.root.position.y) * 4.0;
      this.velocity.y += hoverForce * dt;
      this.velocity.y *= 0.9; // damp Y
    }

    if (this.velocity.lengthSq() > 0.01 || this.state === EnemyState.DEAD) {
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
