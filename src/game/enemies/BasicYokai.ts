import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyState } from './EnemyState';
import { HealthComponent, HealthEventPayload } from '../combat/HealthComponent';
import { CharacterRig } from '../characters/CharacterRig';
import { EnemyAnimator } from './EnemyAnimator';
import { EnemyFactory } from './EnemyFactory';
import { HitboxSystem } from '../physics/HitboxSystem';

export class BasicYokai implements Enemy {
  public id: string;
  public root: THREE.Group;
  public health: HealthComponent;
  public state: EnemyState = EnemyState.IDLE;

  private rig: CharacterRig;
  private animator: EnemyAnimator;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private stateTimer: number = 0;
  private isDeathVfxPlayed: boolean = false;
  
  // AI Params
  private aggroRange: number = 12;
  private attackRange: number = 2.5;
  private speed: number = 2.5;

  private attackCooldown: number = 0;

  constructor(id: string) {
    this.id = id;
    this.root = new THREE.Group();
    this.root.name = `BasicYokai_${id}`;

    this.rig = EnemyFactory.createBasicYokai();
    this.root.add(this.rig.root);

    this.animator = new EnemyAnimator(this.rig);

    this.health = new HealthComponent(100);
    this.health.onDamage(this.onDamageTaken.bind(this));
    this.health.onDeath(this.onDeath.bind(this));
  }

  public takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number): void {
    if (this.health.isDead) return;

    // Apply knockback
    this.velocity.copy(knockbackDir).multiplyScalar(knockbackPower);
    
    // Apply damage
    this.health.takeDamage(amount, 'PLAYER');
  }

  private onDamageTaken(event: HealthEventPayload): void {
    if (this.health.isDead) return;

    // Enter hurt state
    this.setState(EnemyState.HURT);
  }

  private onDeath(event: HealthEventPayload): void {
    this.setState(EnemyState.DEAD);
  }

  public reset(position: THREE.Vector3): void {
    this.root.position.copy(position);
    this.health['currentHealth'] = this.health['maxHealth']; // Reset health manually
    this.health.isDead = false;
    this.velocity.set(0, 0, 0);
    this.attackCooldown = 0;
    this.isDeathVfxPlayed = false;
    this.setState(EnemyState.IDLE);
    // Reset rotations explicitly
    this.root.rotation.set(0, 0, 0);
    this.root.visible = true; // Restore visibility
    // EnemyAnimator state resets gradually, which is fine
  }

  private setState(newState: EnemyState): void {
    if (this.state === EnemyState.DEAD) return; // Can't change state if dead
    this.state = newState;
    this.stateTimer = 0;
    this.animator.setState(newState);
  }

  public update(dt: number, playerPos: THREE.Vector3, hitboxSystem: HitboxSystem, collisionSystem: any, vfx?: any): void {
    this.stateTimer += dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    this.animator.update(dt);

    if (this.state === EnemyState.DEAD) {
      if (!this.isDeathVfxPlayed && vfx) {
        vfx.spawnDeath(this.root.position);
        this.isDeathVfxPlayed = true;
        this.root.visible = false; // Hide mesh, only show particles
      }
      
      // Allow knockback to settle then stop
      this.applyVelocity(dt, collisionSystem);
      return; 
    }

    // Register hurtbox for this frame
    hitboxSystem.registerHurtbox({
      id: this.id,
      position: this.root.position.clone(),
      radius: 0.6,
      height: 2.0
    });

    if (this.state === EnemyState.HURT) {
      this.applyVelocity(dt, collisionSystem);
      if (this.stateTimer > 0.4) {
        this.setState(EnemyState.IDLE);
      }
      return;
    }

    if (this.state === EnemyState.ATTACK) {
      // Procedural attack timing
      const windup = 0.4;
      const activeStart = 0.4;
      const activeEnd = 0.6;
      const recovery = 1.0;

      if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
        // Only trigger once per attack by checking the very first frame of active
        if (this.stateTimer - dt < activeStart) {
          hitboxSystem.resetAttackMemory(this.id);
        }

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.root.rotation.y);
        hitboxSystem.addActiveHitbox({
          ownerId: this.id,
          damage: 15,
          position: this.root.position.clone(),
          direction: forward,
          range: 2.5,
          hitAngle: Math.PI / 2, // Wide swing
          knockback: 15
        });
        
        // Small forward lunge
        this.velocity.copy(forward).multiplyScalar(5);
      } else {
        this.velocity.set(0, 0, 0); // Stop moving during windup/recovery
      }

      if (this.stateTimer >= recovery) {
        this.setState(EnemyState.IDLE);
        this.attackCooldown = 1.5; // Cooldown before next attack
      }

      this.applyVelocity(dt, collisionSystem);
      return;
    }

    // AI Logic
    const distToPlayer = this.root.position.distanceTo(playerPos);
    
    if (distToPlayer < this.aggroRange && distToPlayer > this.attackRange) {
      // Walk towards player
      this.setState(EnemyState.WALK);
      
      const dir = playerPos.clone().sub(this.root.position).normalize();
      this.velocity.copy(dir).multiplyScalar(this.speed);
      
      // Look at player
      const targetRotation = Math.atan2(dir.x, dir.z);
      this.root.rotation.y = targetRotation; // Instant turn for now
      
    } else if (distToPlayer <= this.attackRange && this.attackCooldown <= 0) {
      // Attack logic
      this.setState(EnemyState.ATTACK);
      this.velocity.set(0, 0, 0);
      
      // Snap to face player instantly when starting attack
      const dir = playerPos.clone().sub(this.root.position).normalize();
      this.root.rotation.y = Math.atan2(dir.x, dir.z);
    } else {
      // Idle or cooldown
      this.setState(EnemyState.IDLE);
      this.velocity.set(0, 0, 0);
      
      // Face player if still in aggro range but cooling down
      if (distToPlayer < this.aggroRange) {
        const dir = playerPos.clone().sub(this.root.position).normalize();
        this.root.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    this.applyVelocity(dt, collisionSystem);
  }

  private applyVelocity(dt: number, collisionSystem: any): void {
    // Apply damping for knockback sliding
    if (this.state === EnemyState.HURT || this.state === EnemyState.DEAD) {
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), dt * 5.0);
    }
    
    // Attack lunge damping
    if (this.state === EnemyState.ATTACK) {
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), dt * 10.0);
    }

    if (this.velocity.lengthSq() > 0.01) {
      const resolvedMove = collisionSystem.resolveMovement(
        this.root.position, 
        this.velocity.clone().multiplyScalar(dt), 
        0.6
      );
      this.root.position.add(resolvedMove);
      
      // Clamp to bounds
      const bounds = { MIN_X: -28, MAX_X: 28, MIN_Z: -28, MAX_Z: 28 };
      this.root.position.x = THREE.MathUtils.clamp(this.root.position.x, bounds.MIN_X, bounds.MAX_X);
      this.root.position.z = THREE.MathUtils.clamp(this.root.position.z, bounds.MIN_Z, bounds.MAX_Z);
    }
  }
}
