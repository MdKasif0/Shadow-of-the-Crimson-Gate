import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyState } from './EnemyState';
import { HealthComponent, HealthEventPayload } from '../combat/HealthComponent';
import { CharacterRig } from '../characters/CharacterRig';
import { ShadowYokaiAnimator } from './ShadowYokaiAnimator';
import { EnemyFactory } from './EnemyFactory';
import { HitboxSystem } from '../combat/HitboxSystem';
import { EnemyAI } from './EnemyAI';
import { SHADOW_YOKAI_CONFIG, EnemyConfig } from './EnemyConfig';
import { AttackRole } from '../combat/AttackDirector';

export class ShadowYokai implements Enemy {
  public id: string;
  public enemyType: string = 'SHADOW_YOKAI';
  public root: THREE.Group;
  public health: HealthComponent;
  public state: EnemyState = EnemyState.IDLE;
  public config: EnemyConfig = SHADOW_YOKAI_CONFIG;

  private rig: CharacterRig;
  private animator: ShadowYokaiAnimator;
  private ai: EnemyAI;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private stateTimer: number = 0;
  private isDeathVfxPlayed: boolean = false;
  private attackCooldown: number = 0;
  private role: AttackRole = AttackRole.FLANKER;
  private homePosition: THREE.Vector3 | null = null;

  public assignRole(role: AttackRole): void {
    this.role = role;
  }

  public setHomePosition(pos: THREE.Vector3): void {
    this.homePosition = pos.clone();
  }

  // Shadow Aura
  private auraTime: number = 0;
  private auraPlanes: THREE.Mesh[] = [];

  constructor(id: string) {
    this.id = id;
    this.root = new THREE.Group();
    this.root.name = `ShadowYokai_${id}`;

    this.rig = EnemyFactory.createShadowYokai();
    this.root.add(this.rig.root);

    this.animator = new ShadowYokaiAnimator(this.rig);
    this.ai = new EnemyAI(this.config);

    this.health = new HealthComponent(this.config.maxHealth);
    this.health.onDamage(this.onDamageTaken.bind(this));
    this.health.onDeath(this.onDeath.bind(this));

    this.createAura();
  }

  private createAura() {
    const auraGeo = new THREE.PlaneGeometry(1.5, 3.0);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x0088aa,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 2; i++) {
      const plane = new THREE.Mesh(auraGeo, auraMat);
      plane.position.y = 1.5;
      this.root.add(plane);
      this.auraPlanes.push(plane);
    }
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
    
    // Reset aura
    for (const plane of this.auraPlanes) {
      plane.visible = true;
    }
  }

  private setState(newState: EnemyState): void {
    if (this.state === EnemyState.DEAD) return;
    this.state = newState;
    this.stateTimer = 0;
    this.animator.setState(newState);
  }

  public update(dt: number, playerPos: THREE.Vector3, hitboxSystem: HitboxSystem, collisionSystem: any, vfx?: any, projectileSystem?: any, allEnemies?: Enemy[]): void {
    this.stateTimer += dt;
    this.auraTime += dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    
    this.animator.update(dt);
    this.updateAura(playerPos);

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
      
      // Fade out aura
      for (const plane of this.auraPlanes) {
        const mat = plane.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, mat.opacity - dt * 0.2);
      }

      this.applyVelocity(dt, collisionSystem);
      return; 
    }

    // Register hurtbox
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
      this.setState(decision.state);
    }

    // Handle movement based on AI decision
    if (this.state === EnemyState.WALK || this.state === EnemyState.STRAFE || this.state === EnemyState.RETREAT) {
      this.velocity.copy(decision.moveDirection).multiplyScalar(this.config.movementSpeed);
    } else {
      // Idle / ATTACK (windup)
      this.velocity.set(0, 0, 0);
    }

    // Handle rotation based on AI decision
    // Smooth turn towards target angle
    let targetY = decision.facingAngle;
    
    // Normalize angles for lerping
    let currentY = this.root.rotation.y;
    while (currentY <= -Math.PI) currentY += Math.PI * 2;
    while (currentY > Math.PI) currentY -= Math.PI * 2;
    
    let diff = targetY - currentY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    this.root.rotation.y = currentY + diff * dt * 8.0;

    this.applyVelocity(dt, collisionSystem);
  }

  private handleAttackLogic(dt: number, hitboxSystem: HitboxSystem) {
    const { attackWindup, attackActive, attackRecovery, damage, knockback } = this.config;
    const activeStart = attackWindup;
    const activeEnd = attackWindup + attackActive;
    const totalTime = attackWindup + attackActive + attackRecovery;

    if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
      // Only trigger once
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
        hitAngle: Math.PI / 2.5, // slightly narrower slash than basic yokai
        knockback: knockback
      });
      
      // Fast lunge
      this.velocity.copy(forward).multiplyScalar(8);
    } else {
      this.velocity.set(0, 0, 0); 
    }

    if (this.stateTimer >= totalTime) {
      this.setState(EnemyState.IDLE);
      this.attackCooldown = this.config.attackCooldownMin + Math.random() * (this.config.attackCooldownMax - this.config.attackCooldownMin);
    }
  }

  private updateAura(playerPos: THREE.Vector3) {
    if (this.health.isDead) return;
    
    // Billboard auras towards player
    const toPlayer = playerPos.clone().sub(this.root.position);
    toPlayer.y = 0;
    const angle = Math.atan2(toPlayer.x, toPlayer.z);
    
    this.auraPlanes[0].rotation.y = angle;
    this.auraPlanes[1].rotation.y = angle + Math.PI / 2; // cross pattern

    // Pulsing animation
    const scale = 1.0 + Math.sin(this.auraTime * 2.0) * 0.1;
    this.auraPlanes[0].scale.set(scale, scale, 1);
    this.auraPlanes[1].scale.set(scale, scale, 1);
  }

  private applyVelocity(dt: number, collisionSystem: any): void {
    // Damping based on state
    let damping = 10.0;
    if (this.state === EnemyState.HURT || this.state === EnemyState.DEAD) {
      damping = 5.0; // slide more when hurt
    } else if (this.state === EnemyState.WALK || this.state === EnemyState.STRAFE || this.state === EnemyState.RETREAT) {
      damping = 15.0; // tight control during movement
    }

    this.velocity.lerp(new THREE.Vector3(0, 0, 0), dt * damping);

    if (this.velocity.lengthSq() > 0.01) {
      const resolvedMove = collisionSystem.resolveMovement(
        this.root.position, 
        this.velocity.clone().multiplyScalar(dt), 
        this.config.collisionRadius
      );
      this.root.position.add(resolvedMove);
      
      // Bounds
      const bounds = { MIN_X: -28, MAX_X: 28, MIN_Z: -28, MAX_Z: 28 };
      this.root.position.x = THREE.MathUtils.clamp(this.root.position.x, bounds.MIN_X, bounds.MAX_X);
      this.root.position.z = THREE.MathUtils.clamp(this.root.position.z, bounds.MIN_Z, bounds.MAX_Z);
    }
  }
}
