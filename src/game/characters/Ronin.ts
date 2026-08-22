import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { CharacterAnimator, AnimState } from './CharacterAnimator';
import { CharacterFactory } from './CharacterFactory';
import { PlayerState, CombatPhase, MovementState } from '../combat/PlayerState';
import { CombatSystem } from '../combat/CombatSystem';
import { Katana } from '../combat/Katana';
import { InputManager } from '../core/InputManager';
import { ATTACK_DATA } from '../combat/AttackData';
import { HealthComponent, HealthEventPayload } from '../combat/HealthComponent';
import { DashSystem } from '../combat/DashSystem';
import { GAME_CONFIG } from '../GameConfig';

export class Ronin {
  public root: THREE.Group;
  private rig: CharacterRig;
  private animator: CharacterAnimator;

  private targetRotation: number = 0;
  private currentRotation: number = 0;

  public state: PlayerState;
  public combat: CombatSystem;
  public health: HealthComponent;
  public dashSystem: DashSystem;
  private katana: Katana;
  
  public isControlsEnabled: boolean = true;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private hurtTimer: number = 0;

  constructor() {
    this.state = new PlayerState();
    this.combat = new CombatSystem(this.state);
    this.dashSystem = new DashSystem(this.state);

    this.health = new HealthComponent(100);
    this.health.onDamage(this.onDamageTaken.bind(this));
    this.health.onDeath(this.onDeath.bind(this));

    // 1. Generate procedural rig and mesh
    this.rig = CharacterFactory.createRonin();
    
    // Attach Weapon
    this.katana = new Katana();
    this.katana.attachTo(this.rig.weaponSlot);
    this.katana.attachSheathTo(this.rig.sheathSlot);

    this.combat.events.addListener({
      onAttackStarted: (attackId) => {
        // We will need a reference to hitbox system, but we can just
        // rely on a flag or pass it, or just let CombatSystem emit it.
        // Actually, we can just let `Ronin.update` check `attackTimer == 0` for now
      }
    });

    // 2. Setup Animation
    this.animator = new CharacterAnimator(this.rig);
    
    // 3. Encapsulate
    this.root = new THREE.Group();
    this.root.name = 'PlayerRonin';
    this.root.add(this.rig.root);
  }

  public takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number): void {
    if (this.health.isDead || this.state.isInvulnerable()) return;
    this.velocity.copy(knockbackDir).multiplyScalar(knockbackPower);
    this.health.takeDamage(amount, 'ENEMY');
  }

  private onDamageTaken(event: HealthEventPayload): void {
    if (this.health.isDead) return;
    this.state.movement = MovementState.HURT;
    this.state.combatPhase = CombatPhase.NONE; // Interrupt attacks
    this.state.currentAttackId = null;
    this.hurtTimer = 0;
    this.state.invulnerabilityTimer = 0.5; // 0.5 seconds i-frames
  }

  private onDeath(event: HealthEventPayload): void {
    this.state.movement = MovementState.DEAD;
    this.state.combatPhase = CombatPhase.NONE;
  }

  public reset(position: THREE.Vector3): void {
    this.setPosition(position.x, position.y, position.z);
    this.health['currentHealth'] = this.health['maxHealth'];
    this.health.isDead = false;
    this.state.movement = MovementState.IDLE;
    this.state.combatPhase = CombatPhase.NONE;
    this.state.currentAttackId = null;
    this.state.invulnerabilityTimer = 0;
    this.velocity.set(0, 0, 0);
    this.targetRotation = 0;
    this.currentRotation = 0;
    this.root.rotation.set(0, 0, 0);
    this.combat['attackTimer'] = 0;
    this.combat['inputBuffer'] = false;
    this.combat['comboWindowActive'] = false;
    this.dashSystem.isDashing = false;
    this.dashSystem['cooldownTimer'] = 0;
  }

  public update(dt: number, inputManager: InputManager, collisionSystem: any, hitboxSystem?: any, vfx?: any): void {
    // I-Frames timer
    if (this.state.invulnerabilityTimer > 0) {
      this.state.invulnerabilityTimer -= dt;
    }

    if (this.state.movement === MovementState.DEAD) {
      // Just collapse and slide
      this.applyVelocity(dt, collisionSystem);
      // Wait, need an animator for dead? We don't have one in CharacterAnimator yet.
      // For now, let's just rotate root to simulate falling or do nothing.
      this.root.rotation.x = THREE.MathUtils.lerp(this.root.rotation.x, -1.5, dt * 5);
      return;
    }

    // Register hurtbox for this frame
    if (hitboxSystem) {
      hitboxSystem.registerHurtbox({
        id: 'PLAYER',
        position: this.root.position.clone(),
        radius: 0.5,
        height: 1.8
      });
    }

    // Process combat inputs
    if (this.isControlsEnabled) {
      if (inputManager.isAttackPressed() && this.state.movement !== MovementState.HURT) {
        this.combat.registerAttackInput();
      }

      // Process Dash
      if (inputManager.isPressed('Space')) {
        const inputMoveDir = inputManager.getMovementDirection();
        this.dashSystem.tryDash(inputMoveDir, this.currentRotation);
      }
    }

    // Update combat state machine
    this.combat.update(dt);

    // Fetch movement dir
    const inputMoveDir = this.isControlsEnabled ? inputManager.getMovementDirection() : new THREE.Vector3();
    const isAttacking = this.state.isAttacking();
    
    let intendedMove = new THREE.Vector3();
    const speed = 4; // GAME_CONFIG.PLAYER.SPEED

    // Priority: HURT > DASH > ATTACK > MOVEMENT
    if (this.state.movement === MovementState.HURT) {
      this.hurtTimer += dt;
      if (this.hurtTimer > 0.4) {
        this.state.movement = MovementState.IDLE;
      }
      this.playIdle();
    } else if (this.state.movement === MovementState.DASH) {
      const dashMove = this.dashSystem.update(dt);
      if (dashMove) intendedMove.copy(dashMove);
      // Also instantly snap rotation to dash dir
      this.targetRotation = Math.atan2(this.dashSystem.dashDirection.x, this.dashSystem.dashDirection.z);
      this.playWalk(); // Need a dash animation, but walk sped up works
      if (vfx && Math.random() > 0.5) vfx.spawnDash(this.root.position, this.targetRotation);
    } else if (isAttacking) {
      // During an attack, standard movement is ignored.
      // But we can apply an attack lunge during the ACTIVE phase
      if (this.state.combatPhase === CombatPhase.ACTIVE && this.state.currentAttackId) {
        const attackDef = ATTACK_DATA[this.state.currentAttackId];
        if (attackDef) {
          // Lunge forward relative to current rotation
          const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentRotation);
          intendedMove = forward.multiplyScalar(attackDef.lungeSpeed * dt);

          if (hitboxSystem) {
            // Reset memory on the very first frame of ACTIVE
            if (this.combat['attackTimer'] <= dt) {
               hitboxSystem.resetAttackMemory('PLAYER');
               
               // Spawn Slash VFX exactly once per attack
               if (vfx) {
                 const typeNum = parseInt(this.state.currentAttackId.replace('ATTACK_', '')) || 1;
                 vfx.spawnSlash(this.root.position, forward, typeNum);
               }
            }

            hitboxSystem.addActiveHitbox({
              ownerId: 'PLAYER',
              damage: attackDef.damage,
              position: this.root.position.clone(),
              direction: forward,
              range: this.katana.getRange(),
              hitAngle: this.katana.getHitAngle(),
              knockback: 10
            });
          }
        }
      }
      this.playIdle(); // Stop walking animation
    } else {
      // Normal Movement
      this.dashSystem.update(dt); // Keep cooldowns ticking
      if (inputMoveDir.lengthSq() > 0) {
        // Set target rotation based on movement direction
        this.targetRotation = Math.atan2(inputMoveDir.x, inputMoveDir.z);
        intendedMove = inputMoveDir.clone().multiplyScalar(speed * dt);
        this.playWalk();
      } else {
        this.playIdle();
      }
    }

    // Apply Knockback velocity
    if (this.state.movement === MovementState.HURT) {
      intendedMove.add(this.velocity.clone().multiplyScalar(dt));
      this.velocity.lerp(new THREE.Vector3(0,0,0), dt * 8); // Damping
    }

    // Resolve Movement against collisions
    if (intendedMove.lengthSq() > 0) {
      const resolvedMove = collisionSystem.resolveMovement(
        this.root.position, 
        intendedMove, 
        0.4 // GAME_CONFIG.PLAYER.COLLISION_RADIUS
      );
      
      this.root.position.add(resolvedMove);

      // Clamp to world bounds
      const bounds = GAME_CONFIG.WORLD.BOUNDS;
      this.root.position.x = THREE.MathUtils.clamp(this.root.position.x, bounds.MIN_X, bounds.MAX_X);
      this.root.position.z = THREE.MathUtils.clamp(this.root.position.z, bounds.MIN_Z, bounds.MAX_Z);
    }

    // Smooth rotation interpolation
    let diff = this.targetRotation - this.currentRotation;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    // Rotate faster during attacks for snap, or normal speed
    const rotationSpeed = isAttacking ? 25.0 : 15.0; 
    this.currentRotation += diff * Math.min(1.0, rotationSpeed * dt);
    
    while (this.currentRotation < -Math.PI) this.currentRotation += Math.PI * 2;
    while (this.currentRotation > Math.PI) this.currentRotation -= Math.PI * 2;

    this.root.rotation.y = this.currentRotation;

    // Pass combat phase to animator
    let maxTime = 1;
    if (this.state.currentAttackId && this.state.combatPhase !== CombatPhase.NONE) {
      const def = ATTACK_DATA[this.state.currentAttackId];
      if (this.state.combatPhase === CombatPhase.WINDUP) maxTime = def.windup;
      else if (this.state.combatPhase === CombatPhase.ACTIVE) maxTime = def.active;
      else if (this.state.combatPhase === CombatPhase.RECOVERY) maxTime = def.recovery;
    }
    const attackProgress = this.combat['attackTimer'] / maxTime;
    
    this.animator.setCombatState(this.state.currentAttackId, this.state.combatPhase, attackProgress);

    // Update internal animation
    this.animator.update(dt);
  }

  public playIdle(): void {
    this.animator.setState(AnimState.IDLE);
  }

  public playWalk(): void {
    this.animator.setState(AnimState.WALK);
  }

  // Position control
  public setPosition(x: number, y: number, z: number): void {
    this.root.position.set(x, y, z);
  }

  // Rotation control
  public setRotation(y: number): void {
    this.targetRotation = y;
    this.currentRotation = y;
    this.root.rotation.set(0, y, 0); // Restore full rotation safely
  }
  
  private applyVelocity(dt: number, collisionSystem: any): void {
    if (this.velocity.lengthSq() > 0.01) {
      const resolvedMove = collisionSystem.resolveMovement(
        this.root.position, 
        this.velocity.clone().multiplyScalar(dt), 
        0.4
      );
      this.root.position.add(resolvedMove);
      this.velocity.lerp(new THREE.Vector3(0,0,0), dt * 5.0);
    }
  }
}
