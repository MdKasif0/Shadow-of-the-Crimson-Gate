import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { CharacterAnimator, AnimState } from './CharacterAnimator';
import { CharacterFactory } from './CharacterFactory';
import { PlayerState, CombatPhase } from '../combat/PlayerState';
import { CombatSystem } from '../combat/CombatSystem';
import { Katana } from '../combat/Katana';
import { InputManager } from '../core/InputManager';
import { ATTACK_DATA } from '../combat/AttackData';

export class Ronin {
  public root: THREE.Group;
  private rig: CharacterRig;
  private animator: CharacterAnimator;

  private targetRotation: number = 0;
  private currentRotation: number = 0;

  public state: PlayerState;
  public combat: CombatSystem;
  private katana: Katana;

  constructor() {
    this.state = new PlayerState();
    this.combat = new CombatSystem(this.state);

    // 1. Generate procedural rig and mesh
    this.rig = CharacterFactory.createRonin();
    
    // Attach Weapon
    this.katana = new Katana();
    this.katana.attachTo(this.rig.weaponSlot);
    this.katana.attachSheathTo(this.rig.sheathSlot);

    // 2. Setup Animation
    this.animator = new CharacterAnimator(this.rig);
    
    // 3. Encapsulate
    this.root = new THREE.Group();
    this.root.name = 'PlayerRonin';
    this.root.add(this.rig.root);
  }

  public update(dt: number, inputManager: InputManager, collisionSystem: any): void {
    // Process combat inputs
    if (inputManager.isAttackPressed()) {
      this.combat.registerAttackInput();
    }

    // Update combat state machine
    this.combat.update(dt);

    // Fetch movement dir
    const inputMoveDir = inputManager.getMovementDirection();
    const isAttacking = this.state.isAttacking();

    let intendedMove = new THREE.Vector3();
    const speed = 4; // GAME_CONFIG.PLAYER.SPEED

    // Locomotion & Rotation
    if (isAttacking) {
      // During an attack, standard movement is ignored.
      // But we can apply an attack lunge during the ACTIVE phase
      if (this.state.combatPhase === CombatPhase.ACTIVE && this.state.currentAttackId) {
        const attackDef = ATTACK_DATA[this.state.currentAttackId];
        if (attackDef) {
          // Lunge forward relative to current rotation
          const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentRotation);
          intendedMove = forward.multiplyScalar(attackDef.lungeSpeed * dt);
        }
      }
      this.playIdle(); // Stop walking animation
    } else {
      if (inputMoveDir.lengthSq() > 0) {
        // Set target rotation based on movement direction
        this.targetRotation = Math.atan2(inputMoveDir.x, inputMoveDir.z);
        intendedMove = inputMoveDir.clone().multiplyScalar(speed * dt);
        this.playWalk();
      } else {
        this.playIdle();
      }
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
      const bounds = { MIN_X: -28, MAX_X: 28, MIN_Z: -28, MAX_Z: 28 };
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
    this.root.rotation.y = y;
  }
}
