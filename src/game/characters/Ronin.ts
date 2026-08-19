import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { CharacterAnimator, AnimState } from './CharacterAnimator';
import { CharacterFactory } from './CharacterFactory';

export class Ronin {
  public root: THREE.Group;
  private rig: CharacterRig;
  private animator: CharacterAnimator;

  private targetRotation: number = 0;
  private currentRotation: number = 0;

  constructor() {
    // 1. Generate procedural rig and mesh
    this.rig = CharacterFactory.createRonin();
    
    // 2. Setup Animation
    this.animator = new CharacterAnimator(this.rig);
    
    // 3. Encapsulate
    this.root = new THREE.Group();
    this.root.name = 'PlayerRonin';
    this.root.add(this.rig.root);
  }

  public update(dt: number, inputMoveDir: THREE.Vector3, collisionSystem: any): void {
    // Handle Locomotion & Rotation
    if (inputMoveDir.lengthSq() > 0) {
      // Set target rotation based on movement direction
      this.targetRotation = Math.atan2(inputMoveDir.x, inputMoveDir.z);
      
      // Calculate intended movement delta
      const speed = 4; // GAME_CONFIG.PLAYER.SPEED;
      const intendedMove = inputMoveDir.clone().multiplyScalar(speed * dt);
      
      // Resolve against environment collisions
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

      this.playWalk();
    } else {
      this.playIdle();
    }

    // Smooth rotation interpolation
    // We use a little trick to always rotate the shortest path
    let diff = this.targetRotation - this.currentRotation;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    const rotationSpeed = 15.0; // Higher = faster rotation
    this.currentRotation += diff * Math.min(1.0, rotationSpeed * dt);
    
    // Normalize current rotation
    while (this.currentRotation < -Math.PI) this.currentRotation += Math.PI * 2;
    while (this.currentRotation > Math.PI) this.currentRotation -= Math.PI * 2;

    this.root.rotation.y = this.currentRotation;

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
