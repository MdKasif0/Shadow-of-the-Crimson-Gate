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
  
  // AI Params
  private aggroRange: number = 15;
  private attackRange: number = 2.5;
  private speed: number = 2.5;

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

  private setState(newState: EnemyState): void {
    if (this.state === EnemyState.DEAD) return; // Can't change state if dead
    this.state = newState;
    this.stateTimer = 0;
    this.animator.setState(newState);
  }

  public update(dt: number, playerPos: THREE.Vector3, hitboxSystem: HitboxSystem): void {
    this.stateTimer += dt;
    this.animator.update(dt);

    if (this.state === EnemyState.DEAD) {
      // Allow knockback to settle then stop
      this.applyVelocity(dt);
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
      this.applyVelocity(dt);
      if (this.stateTimer > 0.4) {
        this.setState(EnemyState.IDLE);
      }
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
      
    } else if (distToPlayer <= this.attackRange) {
      // Attack logic (placeholder)
      this.setState(EnemyState.ATTACK);
      this.velocity.set(0, 0, 0);
    } else {
      // Idle
      this.setState(EnemyState.IDLE);
      this.velocity.set(0, 0, 0);
    }

    this.applyVelocity(dt);
  }

  private applyVelocity(dt: number): void {
    // Apply damping for knockback sliding
    if (this.state === EnemyState.HURT || this.state === EnemyState.DEAD) {
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), dt * 5.0);
    }

    this.root.position.addScaledVector(this.velocity, dt);
  }
}
